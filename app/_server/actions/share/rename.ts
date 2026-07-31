import path from "path";
import fs from "fs/promises";
import { revalidateTag } from "next/cache";
import { Modes } from "@/app/_types/enums";
import { SharingPermissions } from "@/app/_types/core";
import { DATA_DIR } from "@/app/_consts/files";
import { CATEGORY_INFO_FILE, SHARED_WITH_KEY } from "@/app/_consts/sharing";
import { parseSharedWith, toSharedWith } from "@/app/_utils/sharing-utils";
import { grepFilesByText } from "@/app/_utils/grep-utils";
import { updateYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { readCatInfo, writeCatInfo } from "./category-info";
import { dropMounts } from "./mounts";

const RENAMED_MODES = [Modes.NOTES, Modes.CHECKLISTS];

const _modeTag = (mode: Modes): string =>
  mode === Modes.CHECKLISTS ? "layout-checklists" : "layout-notes";

const _swapKey = (
  users: Record<string, SharingPermissions>,
  oldName: string,
  newName: string,
): Record<string, SharingPermissions> | null => {
  const perms = users[oldName];
  if (!perms) return null;

  const next = { ...users, [newName]: perms };
  delete next[oldName];

  return next;
};

const _renameInFiles = async (
  mode: Modes,
  oldName: string,
  newName: string,
): Promise<number> => {
  const modeDir = path.join(process.cwd(), DATA_DIR, mode);
  const candidates = await grepFilesByText(modeDir, oldName, "*.md");
  let touched = 0;

  for (const filePath of candidates) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const line = content.match(new RegExp(`^${SHARED_WITH_KEY}:.*$`, "m"));

      if (!line) continue;

      const parsed = parseSharedWith(line[0].split(":").slice(1).join(":").trim());
      if (!parsed || parsed.optedOut) continue;

      const swapped = _swapKey(parsed.users, oldName, newName);
      if (!swapped) continue;

      const updated = updateYamlMetadata(content, {
        [SHARED_WITH_KEY]: toSharedWith(swapped),
      });

      await fs.writeFile(filePath, updated, "utf-8");
      touched += 1;
    } catch (error) {
      console.error(`Failed renaming share in ${filePath}:`, error);
    }
  }

  return touched;
};

const _renameInCats = async (
  mode: Modes,
  oldName: string,
  newName: string,
): Promise<number> => {
  const modeDir = path.join(process.cwd(), DATA_DIR, mode);
  const candidates = await grepFilesByText(modeDir, oldName, CATEGORY_INFO_FILE);
  let touched = 0;

  for (const infoFile of candidates) {
    const dir = path.dirname(infoFile);

    try {
      const info = await readCatInfo(dir);
      if (!info.sharing?.users) continue;

      const swapped = _swapKey(info.sharing.users, oldName, newName);
      if (!swapped) continue;

      await writeCatInfo(dir, {
        ...info,
        sharing: { ...info.sharing, users: swapped },
      });

      touched += 1;
    } catch (error) {
      console.error(`Failed renaming share in ${dir}:`, error);
    }
  }

  return touched;
};

export const renameGrants = async (
  oldName: string,
  newName: string,
): Promise<number> => {
  let touched = 0;

  for (const mode of RENAMED_MODES) {
    const perMode =
      (await _renameInFiles(mode, oldName, newName)) +
      (await _renameInCats(mode, oldName, newName));

    if (perMode > 0) {
      dropMounts(mode);
      revalidateTag(_modeTag(mode), { expire: 0 });
    }

    touched += perMode;
  }

  return touched;
};
