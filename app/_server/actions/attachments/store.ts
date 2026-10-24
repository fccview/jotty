import path from "path";
import fs from "fs/promises";
import { createReadStream } from "fs";
import { createHash, randomUUID } from "crypto";
import { DATA_DIR } from "@/app/_consts/files";
import {
  ATTACHMENTS_FOLDER,
  ATTACHMENT_FALLBACK_NAME,
  ATTACHMENT_NAME_BYTES,
  ATTACHMENT_NAME_MAX,
  AVATARS_FOLDER,
  attachmentUrl,
  extOf,
  kindOf,
  mimeOf,
} from "@/app/_consts/attachments";
import { isUuid } from "@/app/_consts/identity";
import { runQueued } from "@/app/_server/actions/lib/concurrency";
import type { FileItem } from "@/app/_types";
import { forgetAttachments, noteAttachments } from "./tracking";

const LINK_REFUSALS = ["EXDEV", "EPERM", "ENOTSUP", "EOPNOTSUPP", "EMLINK", "ENOSYS"];
const MAX_SUFFIX = 10000;
const PART_SUFFIX = ".part";
const UNSAFE_CHARS = /[\u0000-\u001f\u007f<>:"/\\|?*%]+/g;
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const LONE_SURROGATE_TEST = new RegExp(LONE_SURROGATE.source);

export interface Placement {
  name: string;
  reused: boolean;
  copied: boolean;
}

const _code = (error: unknown): string | undefined =>
  (error as NodeJS.ErrnoException | null)?.code;

export const attachmentsRoot = (): string =>
  path.join(process.cwd(), DATA_DIR, ATTACHMENTS_FOLDER);

export const avatarsDir = (): string =>
  path.join(attachmentsRoot(), AVATARS_FOLDER);

export const folderOf = (itemUuid: string): string | null =>
  isUuid(itemUuid) ? path.join(attachmentsRoot(), itemUuid.toLowerCase()) : null;

const _lane = (itemUuid: string): string => `attachments:${itemUuid.toLowerCase()}`;

const _bytes = (text: string): number => Buffer.byteLength(text, "utf8");

export const isCleanName = (name: string): boolean =>
  name.length > 0 &&
  _bytes(name) <= ATTACHMENT_NAME_BYTES &&
  !name.startsWith(".") &&
  !/[\u0000-\u001f\u007f/\\%]/.test(name) &&
  !LONE_SURROGATE_TEST.test(name);

export const fileOf = (itemUuid: string, name: string): string | null => {
  const folder = folderOf(itemUuid);
  if (!folder || !isCleanName(name)) return null;

  const full = path.join(folder, name);
  return path.dirname(full) === folder ? full : null;
};

const _fit = (text: string, budget: number): string => {
  const kept: string[] = [];
  let used = 0;

  for (const char of Array.from(text)) {
    used += _bytes(char);
    if (used > budget) break;
    kept.push(char);
  }

  return kept.join("");
};

const _clip = (name: string): string => {
  if (_bytes(name) <= ATTACHMENT_NAME_MAX) return name;
  const ext = extOf(name);
  const tail = ext && _bytes(ext) <= ATTACHMENT_NAME_MAX / 2 ? name.slice(name.length - ext.length) : "";
  const stem = tail ? name.slice(0, -tail.length) : name;
  return `${_fit(stem, ATTACHMENT_NAME_MAX - _bytes(tail))}${tail}`;
};

export const cleanName = (original: string): string => {
  const base = path.posix
    .basename(original.replace(/\\/g, "/"))
    .replace(LONE_SURROGATE, "")
    .normalize("NFC");
  const scrubbed = base
    .replace(UNSAFE_CHARS, "-")
    .replace(/\s+/g, " ")
    .replace(/-{2,}/g, "-")
    .replace(/^[.\s-]+/, "")
    .replace(/[.\s]+$/, "");
  const clipped = _clip(scrubbed);

  return isCleanName(clipped) ? clipped : ATTACHMENT_FALLBACK_NAME;
};

const _candidate = (name: string, n: number): string => {
  if (n === 0) return name;
  const ext = extOf(name);
  const stem = ext ? name.slice(0, -ext.length) : name;
  return `${stem}-${n}${ext}`;
};

export const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.lstat(filePath);
    return true;
  } catch (error) {
    if (_code(error) === "ENOENT") return false;
    throw error;
  }
};

const _hash = (filePath: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(filePath)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolve(hash.digest("hex")));
  });

export const sameContent = async (a: string, b: string): Promise<boolean> => {
  const [left, right] = await Promise.all([fs.stat(a), fs.stat(b)]);
  if (left.dev === right.dev && left.ino === right.ino) return true;
  if (left.size !== right.size) return false;

  const [first, second] = await Promise.all([_hash(a), _hash(b)]);
  return first === second;
};

const _partOf = (folder: string): string =>
  path.join(folder, `.${randomUUID()}${PART_SUFFIX}`);

const _moveIn = async (part: string, target: string): Promise<boolean> => {
  if (await exists(target)) return false;
  await fs.rename(part, target);
  return true;
};

const _place = async (
  source: string,
  target: string,
  folder: string,
): Promise<{ placed: boolean; copied: boolean }> => {
  try {
    await fs.link(source, target);
    return { placed: true, copied: false };
  } catch (error) {
    if (_code(error) === "EEXIST") return { placed: false, copied: false };
    if (!LINK_REFUSALS.includes(_code(error) || "")) throw error;
  }

  const part = _partOf(folder);
  try {
    await fs.copyFile(source, part);
    return { placed: await _moveIn(part, target), copied: true };
  } finally {
    await fs.rm(part, { force: true });
  }
};

const _adopt = async (
  source: string,
  itemUuid: string,
  wanted: string,
): Promise<Placement> => {
  const folder = folderOf(itemUuid);
  if (!folder) throw new Error(`Not an item uuid: ${itemUuid}`);

  await fs.mkdir(folder, { recursive: true });
  const name = isCleanName(wanted) ? wanted : cleanName(wanted);

  for (let n = 0; n < MAX_SUFFIX; n++) {
    const candidate = _candidate(name, n);
    const target = path.join(folder, candidate);

    if (await exists(target)) {
      if (await sameContent(source, target)) {
        return { name: candidate, reused: true, copied: false };
      }
      continue;
    }

    const { placed, copied } = await _place(source, target, folder);
    if (placed) return { name: candidate, reused: false, copied };
  }

  throw new Error(`No free attachment name for ${name} in ${itemUuid}`);
};

export const adoptFile = async (
  source: string,
  itemUuid: string,
  wanted: string,
): Promise<Placement> => {
  const placed = await runQueued(_lane(itemUuid), () =>
    _adopt(source, itemUuid, wanted),
  );
  if (!placed.reused) await noteAttachments(itemUuid);
  return placed;
};

export const storeUpload = async (
  itemUuid: string,
  original: string,
  data: Buffer,
): Promise<string> => {
  const folder = folderOf(itemUuid);
  if (!folder) throw new Error(`Not an item uuid: ${itemUuid}`);

  const name = await runQueued(_lane(itemUuid), async () => {
    await fs.mkdir(folder, { recursive: true });
    const part = _partOf(folder);

    try {
      await fs.writeFile(part, data);
      const wanted = cleanName(original);

      for (let n = 0; n < MAX_SUFFIX; n++) {
        const candidate = _candidate(wanted, n);
        if (await _moveIn(part, path.join(folder, candidate))) return candidate;
      }

      throw new Error(`No free attachment name for ${wanted} in ${itemUuid}`);
    } finally {
      await fs.rm(part, { force: true });
    }
  });

  await noteAttachments(itemUuid);
  return name;
};

export const describeFile = (
  itemUuid: string,
  name: string,
  stats: { size: number; birthtime: Date; mtime: Date },
): FileItem => {
  const mimeType = mimeOf(name);
  const born = stats.birthtime.getTime() > 0 ? stats.birthtime : stats.mtime;

  return {
    fileName: name,
    name,
    url: attachmentUrl(itemUuid, name),
    type: kindOf(mimeType),
    mimeType,
    size: stats.size,
    uploadedAt: born.toISOString(),
    itemUuid,
  };
};

export const listFolder = async (itemUuid: string): Promise<FileItem[]> => {
  const folder = folderOf(itemUuid);
  if (!folder) return [];

  let names: string[];
  try {
    const entries = await fs.readdir(folder, { withFileTypes: true });
    names = entries
      .filter((entry) => entry.isFile() && isCleanName(entry.name))
      .map((entry) => entry.name);
  } catch (error) {
    if (_code(error) !== "ENOENT") {
      console.error(`Failed to list attachments of ${itemUuid}:`, error);
    }
    return [];
  }

  const files = await Promise.all(
    names.map(async (name) => {
      try {
        return describeFile(itemUuid, name, await fs.lstat(path.join(folder, name)));
      } catch (error) {
        console.error(`Failed to stat attachment ${itemUuid}/${name}:`, error);
        return null;
      }
    }),
  );

  return files
    .filter((file): file is FileItem => file !== null)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
};

const _dropEmpty = async (folder: string): Promise<void> => {
  try {
    await fs.rmdir(folder);
  } catch (error) {
    const code = _code(error);
    if (code !== "ENOTEMPTY" && code !== "EEXIST" && code !== "ENOENT") {
      console.error(`Failed to tidy attachment folder ${folder}:`, error);
    }
  }
};

export const removeFile = async (
  itemUuid: string,
  name: string,
): Promise<boolean> => {
  const filePath = fileOf(itemUuid, name);
  if (!filePath) return false;

  const removed = await runQueued(_lane(itemUuid), async () => {
    try {
      const stats = await fs.lstat(filePath);
      if (!stats.isFile()) return false;
      await fs.unlink(filePath);
      await _dropEmpty(path.dirname(filePath));
      return true;
    } catch (error) {
      if (_code(error) === "ENOENT") return false;
      throw error;
    }
  });

  if (removed) await forgetAttachments(itemUuid);
  return removed;
};

export const removeFolder = async (itemUuid: string): Promise<void> => {
  const folder = folderOf(itemUuid);
  if (!folder) return;

  await runQueued(_lane(itemUuid), () =>
    fs.rm(folder, { recursive: true, force: true }),
  );
  await forgetAttachments(itemUuid);
};

export const cloneFolder = async (
  fromUuid: string,
  toUuid: string,
): Promise<Map<string, string>> => {
  const renamed = new Map<string, string>();
  const folder = folderOf(fromUuid);
  if (!folder || !folderOf(toUuid) || fromUuid === toUuid) return renamed;

  const files = await listFolder(fromUuid);

  for (const file of files) {
    const placed = await adoptFile(path.join(folder, file.name), toUuid, file.name);
    renamed.set(file.name, placed.name);
  }

  return renamed;
};
