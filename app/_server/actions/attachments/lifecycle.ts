import path from "path";
import fs from "fs/promises";
import { ATTACHMENT_ROUTE } from "@/app/_consts/attachments";
import { DATA_DIR } from "@/app/_consts/files";
import { isUuid } from "@/app/_consts/identity";
import { Modes } from "@/app/_types/enums";
import { grepFilesMentioningAny } from "@/app/_utils/grep-utils";
import { isPathUuid } from "@/app/_server/actions/lib/read-only";
import { locateItem } from "./access";
import { cloneFolder, folderOf, removeFolder } from "./store";

const _prefix = (uuid: string): string => `${ATTACHMENT_ROUTE}/${uuid.toLowerCase()}/`;

export const rebaseUrls = (content: string, fromUuid: string, toUuid: string): string =>
  content.split(_prefix(fromUuid)).join(_prefix(toUuid));

export const carryAttachments = async (
  fromUuid: string,
  toUuid: string,
  content: string,
): Promise<string> => {
  if (!isUuid(fromUuid) || !isUuid(toUuid) || fromUuid === toUuid) return content;

  try {
    const cloned = await cloneFolder(fromUuid, toUuid);
    const renamed = Array.from(cloned).some(([from, to]) => from !== to);
    if (!cloned.size || renamed) return content;
    return rebaseUrls(content, fromUuid, toUuid);
  } catch (error) {
    console.error(`Could not carry attachments from ${fromUuid} to ${toUuid}:`, error);
    return content;
  }
};

const _itemDirs = async (): Promise<string[]> => {
  const dirs = [Modes.NOTES, Modes.CHECKLISTS].map((mode) => path.join(process.cwd(), DATA_DIR, mode));
  const present = await Promise.all(
    dirs.map((dir) => fs.stat(dir).then((stats) => stats.isDirectory(), () => false)),
  );
  return dirs.filter((_, index) => present[index]);
};

const _withFolders = async (uuids: string[]): Promise<string[]> => {
  const present = await Promise.all(
    uuids.map((uuid) => fs.stat(folderOf(uuid)!).then((stats) => stats.isDirectory(), () => false)),
  );
  return uuids.filter((_, index) => present[index]);
};

const _claims = (text: string, uuid: string): boolean =>
  new RegExp(`^uuid:[ \\t]*["']?${uuid}`, "m").test(text);

const _mentioning = async (uuids: string[]): Promise<string[] | null> => {
  const files = await grepFilesMentioningAny(await _itemDirs(), uuids);
  if (!files) return null;

  const texts = await Promise.all(
    files.map((filePath) =>
      fs.readFile(filePath, "utf-8").then(
        (text) => text.toLowerCase(),
        (error) => {
          console.error(`Could not read ${filePath} while sweeping attachments:`, error);
          return null;
        },
      ),
    ),
  );

  return texts.every((text) => text !== null) ? (texts as string[]) : null;
};

export const sweepOrphans = async (uuids: string[]): Promise<number> => {
  const wanted = Array.from(new Set(uuids.filter(isUuid).map((uuid) => uuid.toLowerCase())));
  const doomed = await _withFolders(wanted);
  if (!doomed.length) return 0;

  const texts = await _mentioning(doomed);
  if (!texts) {
    console.warn("Kept attachment folders of deleted items, could not check who still uses them");
    return 0;
  }

  let removed = 0;
  for (const uuid of doomed) {
    try {
      if (texts.some((text) => _claims(text, uuid))) continue;
      if (isPathUuid(uuid) && (await locateItem(uuid))) continue;
      if (texts.some((text) => text.includes(_prefix(uuid)))) {
        console.warn(`Kept attachments of deleted item ${uuid}, other items still embed them`);
        continue;
      }
      await removeFolder(uuid);
      removed++;
    } catch (error) {
      console.error(`Could not remove attachments of deleted item ${uuid}:`, error);
    }
  }

  return removed;
};
