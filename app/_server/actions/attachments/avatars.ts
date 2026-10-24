import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { IMAGE_MIME_BY_EXT } from "@/app/_consts/files";
import { extOf } from "@/app/_consts/attachments";
import { isUuid } from "@/app/_consts/identity";
import { runQueued } from "@/app/_server/actions/lib/concurrency";
import { avatarsDir } from "./store";

const _lane = (userUuid: string): string => `avatar:${userUuid}`;

const _isAvatarExt = (ext: string): boolean => ext in IMAGE_MIME_BY_EXT;

export const avatarExtFor = (fileName: string, mimeType: string): string | null => {
  const named = extOf(fileName);
  if (_isAvatarExt(named) && IMAGE_MIME_BY_EXT[named] === mimeType) return named;
  return Object.keys(IMAGE_MIME_BY_EXT).find((ext) => IMAGE_MIME_BY_EXT[ext] === mimeType) ?? null;
};

const _ownedBy = async (userUuid: string): Promise<string[]> => {
  try {
    const entries = await fs.readdir(avatarsDir(), { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.startsWith(`${userUuid}.`))
      .filter((entry) => _isAvatarExt(extOf(entry.name)))
      .map((entry) => entry.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Failed to list avatars:", error);
    }
    return [];
  }
};

export const avatarFileOf = async (userUuid: string): Promise<string | null> => {
  if (!isUuid(userUuid)) return null;
  const [name] = await _ownedBy(userUuid);
  return name ? path.join(avatarsDir(), name) : null;
};

const _swapIn = async (userUuid: string, ext: string, fill: (part: string) => Promise<void>) => {
  const dir = avatarsDir();
  await fs.mkdir(dir, { recursive: true });
  const part = path.join(dir, `.${randomUUID()}.part`);
  const target = path.join(dir, `${userUuid}${ext}`);

  try {
    await fill(part);
    await fs.rename(part, target);
  } finally {
    await fs.rm(part, { force: true });
  }

  const stale = (await _ownedBy(userUuid)).filter((name) => name !== path.basename(target));
  await Promise.all(stale.map((name) => fs.rm(path.join(dir, name), { force: true })));

  return Math.floor((await fs.stat(target)).mtimeMs);
};

export const saveAvatar = (userUuid: string, ext: string, data: Buffer): Promise<number> => {
  if (!isUuid(userUuid) || !_isAvatarExt(ext)) {
    return Promise.reject(new Error(`Refusing avatar ${userUuid}${ext}`));
  }
  return runQueued(_lane(userUuid), () =>
    _swapIn(userUuid, ext, (part) => fs.writeFile(part, data)),
  );
};

export const copyAvatar = (userUuid: string, ext: string, source: string): Promise<number> => {
  if (!isUuid(userUuid) || !_isAvatarExt(ext)) {
    return Promise.reject(new Error(`Refusing avatar ${userUuid}${ext}`));
  }
  return runQueued(_lane(userUuid), () =>
    _swapIn(userUuid, ext, (part) => fs.copyFile(source, part)),
  );
};

export const removeAvatar = async (userUuid: string): Promise<void> => {
  if (!isUuid(userUuid)) return;
  await runQueued(_lane(userUuid), async () => {
    const owned = await _ownedBy(userUuid);
    await Promise.all(owned.map((name) => fs.rm(path.join(avatarsDir(), name), { force: true })));
  });
};
