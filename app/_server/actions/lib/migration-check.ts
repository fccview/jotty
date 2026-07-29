import path from "path";
import fs from "fs/promises";
import { Modes } from "@/app/_types/enums";
import { DATA_DIR, ARCHIVED_DIR_NAME, EXCLUDED_DIRS } from "@/app/_consts/files";
import { LEGACY_ORDER_FILE, LEGACY_SHARING_FILE } from "@/app/_consts/sharing";

const CHECKED_MODES = [Modes.NOTES, Modes.CHECKLISTS];

const _hasOrderFile = async (dirPath: string): Promise<boolean> => {
  const excluded = [...EXCLUDED_DIRS, ARCHIVED_DIR_NAME];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name === LEGACY_ORDER_FILE) return true;

      if (entry.isDirectory() && !excluded.includes(entry.name)) {
        if (await _hasOrderFile(path.join(dirPath, entry.name))) return true;
      }
    }
  } catch {
    return false;
  }

  return false;
};

export const needsMigration = async (): Promise<boolean> => {
  for (const mode of CHECKED_MODES) {
    const modeDir = path.join(process.cwd(), DATA_DIR, mode);

    try {
      await fs.access(path.join(modeDir, LEGACY_SHARING_FILE));
      return true;
    } catch {}

    if (await _hasOrderFile(modeDir)) return true;
  }

  return false;
};
