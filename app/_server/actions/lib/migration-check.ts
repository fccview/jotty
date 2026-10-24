import path from "path";
import fs from "fs/promises";
import { Modes } from "@/app/_types/enums";
import {
  ATTACHMENTS_SCHEMA_VERSION,
  DATA_DIR,
  RESERVED_DIRS,
  DATA_SCHEMA_VERSION,
  SCHEMA_VERSION_FILE,
  SHARING_SCHEMA_VERSION,
} from "@/app/_consts/files";
import { LEGACY_DIRS, RETIRED_PUBLIC_ENV } from "@/app/_consts/attachments";
import { LEGACY_ORDER_FILE, LEGACY_SHARING_FILE } from "@/app/_consts/sharing";
import { isWritable } from "@/app/_server/actions/lib/read-only";
import { backfillUserUuids } from "@/app/_server/actions/users/records";

export interface PendingMigrations {
  sharing: boolean;
  attachments: boolean;
}

const CHECKED_MODES = [Modes.NOTES, Modes.CHECKLISTS];

declare global {
  var __jottyRetiredEnvWarned: boolean | undefined;
}

const _versionPath = (): string =>
  path.join(process.cwd(), SCHEMA_VERSION_FILE);

export const storedSchema = async (): Promise<number> => {
  try {
    const content = await fs.readFile(_versionPath(), "utf-8");
    const parsed = Number.parseInt(content.trim(), 10);

    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
};

export const stampSchema = async (version = DATA_SCHEMA_VERSION): Promise<void> => {
  try {
    const next = Math.min(Math.max(version, await storedSchema()), DATA_SCHEMA_VERSION);
    await fs.mkdir(path.dirname(_versionPath()), { recursive: true });
    await fs.writeFile(_versionPath(), String(next), "utf-8");
  } catch (error) {
    console.error("Failed to stamp the data schema version:", error);
  }
};

const _hasOrderFile = async (dirPath: string): Promise<boolean> => {
  const excluded = RESERVED_DIRS;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name === LEGACY_ORDER_FILE) {
        if (await isWritable(dirPath)) return true;
        continue;
      }

      if (entry.isDirectory() && !excluded.includes(entry.name)) {
        if (await _hasOrderFile(path.join(dirPath, entry.name))) return true;
      }
    }
  } catch {
    return false;
  }

  return false;
};

const _sharingPending = async (): Promise<boolean> => {
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

const _hasFiles = async (dirPath: string): Promise<boolean> => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.some((entry) => entry.isFile() && !entry.name.startsWith("."));
  } catch {
    return false;
  }
};

export const legacyMediaDirs = async (): Promise<string[]> => {
  const notesRoot = path.join(process.cwd(), DATA_DIR, Modes.NOTES);

  try {
    const owners = await fs.readdir(notesRoot, { withFileTypes: true });
    return owners
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .flatMap((entry) =>
        Object.values(LEGACY_DIRS).map((dir) => path.join(notesRoot, entry.name, dir)),
      );
  } catch {
    return [];
  }
};

const _attachmentsPending = async (): Promise<boolean> => {
  for (const dir of await legacyMediaDirs()) {
    if (await _hasFiles(dir)) return true;
  }
  return false;
};

export const pendingMigrations = async (): Promise<PendingMigrations> => {
  const stored = await storedSchema();

  return {
    sharing: stored < SHARING_SCHEMA_VERSION && (await _sharingPending()),
    attachments: stored < ATTACHMENTS_SCHEMA_VERSION && (await _attachmentsPending()),
  };
};

const _warnRetiredEnv = () => {
  if (globalThis.__jottyRetiredEnvWarned) return;
  globalThis.__jottyRetiredEnvWarned = true;

  const set = Object.values(RETIRED_PUBLIC_ENV).filter((name) => process.env[name]);
  if (set.length) {
    console.warn(
      `${set.join(", ")} no longer do anything. Attachments of public items are public, everything else follows the item's sharing.`,
    );
  }
};

export const needsMigration = async (): Promise<boolean> => {
  if ((await storedSchema()) >= DATA_SCHEMA_VERSION) {
    _warnRetiredEnv();
    return false;
  }

  const pending = await pendingMigrations();
  if (pending.sharing || pending.attachments) return true;

  if ((await backfillUserUuids()) === null) {
    console.error("Could not give every user a uuid, leaving the schema unstamped");
    return false;
  }

  await stampSchema();
  return false;
};
