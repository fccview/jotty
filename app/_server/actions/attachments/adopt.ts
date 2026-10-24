import fs from "fs/promises";
import { AttachmentKinds, attachmentUrl } from "@/app/_consts/attachments";
import { appOrigins } from "@/app/_server/actions/relations/paths";
import { scanAttachments, swapRefs } from "@/app/_utils/legacy-refs";
import { locateItem, mayView } from "./access";
import { legacyFileOf } from "./legacy-files";
import { safeDecode } from "./serve";
import { adoptFile, fileOf } from "./store";

const LEGACY_SEGMENTS = /\/api\/(image|video|file)\/([^/?#\s]+)\/([^/?#\s]+)/;
const ATTACHMENT_SEGMENTS = /\/api\/attachment\/([^/?#\s]+)\/([^/?#\s]+)/;
const ADOPT_MAX = 500;
const LEGACY_KINDS: Record<string, AttachmentKinds> = {
  image: AttachmentKinds.IMAGE,
  video: AttachmentKinds.VIDEO,
  file: AttachmentKinds.FILE,
};

interface Source {
  filePath: string;
  name: string;
}

const _isFile = async (filePath: string | null): Promise<boolean> =>
  Boolean(filePath && (await fs.lstat(filePath).catch(() => null))?.isFile());

const _legacySource = async (url: string, username: string): Promise<Source | null> => {
  const match = LEGACY_SEGMENTS.exec(url);
  if (!match) return null;

  const owner = safeDecode(match[2]);
  const name = safeDecode(match[3]);
  if (owner !== username) return null;

  const filePath = legacyFileOf(owner, LEGACY_KINDS[match[1]], name);
  return filePath && (await _isFile(filePath)) ? { filePath, name } : null;
};

const _itemSource = async (
  url: string,
  target: string,
  readable: (uuid: string) => Promise<boolean>,
): Promise<Source | null> => {
  const match = ATTACHMENT_SEGMENTS.exec(url);
  if (!match) return null;

  const item = match[1].toLowerCase();
  const name = safeDecode(match[2]);
  if (item === target) return null;

  const filePath = fileOf(item, name);
  if (!filePath || !(await _isFile(filePath)) || !(await readable(item))) return null;
  return { filePath, name };
};

const _reader = (username: string) => {
  const seen = new Map<string, Promise<boolean>>();

  return (uuid: string): Promise<boolean> => {
    if (!seen.has(uuid)) {
      seen.set(
        uuid,
        locateItem(uuid).then((item) => (item ? mayView(item, username) : false)),
      );
    }
    return seen.get(uuid)!;
  };
};

export const adoptUrls = async (
  targetUuid: string,
  username: string,
  urls: string[],
): Promise<Record<string, string>> => {
  const target = targetUuid.toLowerCase();
  const readable = _reader(username);
  const swapped: Record<string, string> = {};
  const wanted = Array.from(new Set(urls.filter((url) => typeof url === "string"))).slice(0, ADOPT_MAX);

  for (const url of wanted) {
    const source =
      (await _legacySource(url, username)) ?? (await _itemSource(url, target, readable));
    if (!source) continue;

    const placed = await adoptFile(source.filePath, target, source.name);
    swapped[url] = attachmentUrl(target, placed.name);
  }

  return swapped;
};

export const rehomeRefs = async (
  itemUuid: string,
  username: string,
  body: string,
): Promise<string> => {
  try {
    const target = itemUuid.toLowerCase();
    const refs = scanAttachments(body, appOrigins()).filter((ref) => ref.item !== target);
    if (!refs.length) return body;

    const moved = await adoptUrls(target, username, refs.map((ref) => ref.url));
    const swaps = refs
      .filter((ref) => moved[ref.url])
      .map((ref) => ({ ref, url: moved[ref.url] }));

    return swaps.length ? swapRefs(body, swaps) : body;
  } catch (error) {
    console.error(`Could not bring other items' attachments into ${itemUuid}:`, error);
    return body;
  }
};
