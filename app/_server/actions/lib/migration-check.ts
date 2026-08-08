import path from "path";
import fs from "fs/promises";
import { Modes } from "@/app/_types/enums";
import {
  DATA_DIR,
  ARCHIVED_DIR_NAME,
  EXCLUDED_DIRS,
  DATA_SCHEMA_VERSION,
  SCHEMA_VERSION_FILE,
} from "@/app/_consts/files";
import { LEGACY_ORDER_FILE, LEGACY_SHARING_FILE } from "@/app/_consts/sharing";

const CHECKED_MODES = [Modes.NOTES, Modes.CHECKLISTS];

const _versionPath = (): string =>
  path.join(process.cwd(), SCHEMA_VERSION_FILE);

const _storedVersion = async (): Promise<number> => {
  try {
    const content = await fs.readFile(_versionPath(), "utf-8");
    const parsed = Number.parseInt(content.trim(), 10);

    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
};

export const stampSchema = async (): Promise<void> => {
  try {
    await fs.mkdir(path.dirname(_versionPath()), { recursive: true });
    await fs.writeFile(_versionPath(), String(DATA_SCHEMA_VERSION), "utf-8");
  } catch (error) {
    console.error("Failed to stamp the data schema version:", error);
  }
};

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
  if ((await _storedVersion()) >= DATA_SCHEMA_VERSION) return false;

  for (const mode of CHECKED_MODES) {
    const modeDir = path.join(process.cwd(), DATA_DIR, mode);

    try {
      await fs.access(path.join(modeDir, LEGACY_SHARING_FILE));
      return true;
    } catch {}

    if (await _hasOrderFile(modeDir)) return true;
  }

  await stampSchema();
  return false;
};
