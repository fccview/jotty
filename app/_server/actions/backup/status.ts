import fs from "fs/promises";
import path from "path";
import { BackupStatus, DEFAULT_BACKUP_STATUS } from "@/app/_types/backup";
import { BACKUP_STATUS_FILE } from "@/app/_consts/backup";

/**
 * Read the persisted backup status from `data/backup-status.json`. Returns the
 * default status when the file is missing or unreadable so the UI always has a
 * well-shaped object to render.
 */
export const readBackupStatus = async (): Promise<BackupStatus> => {
  try {
    const filePath = path.join(process.cwd(), BACKUP_STATUS_FILE);
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content) as Partial<BackupStatus>;
    return { ...DEFAULT_BACKUP_STATUS, ...parsed };
  } catch {
    return { ...DEFAULT_BACKUP_STATUS };
  }
};

/**
 * Persist backup status to `data/backup-status.json` using an atomic
 * rename-to-final pattern (matches writeJsonFile in the file action).
 */
export const writeBackupStatus = async (
  status: BackupStatus,
): Promise<void> => {
  const finalPath = path.join(process.cwd(), BACKUP_STATUS_FILE);
  const tmpPath = `${finalPath}.${Date.now()}.tmp`;
  try {
    await fs.mkdir(path.dirname(finalPath), { recursive: true });
    await fs.writeFile(tmpPath, JSON.stringify(status, null, 2), "utf-8");
    await fs.rename(tmpPath, finalPath);
  } catch (err) {
    try {
      await fs.unlink(tmpPath);
    } catch {
      /* ignore */
    }
    throw err;
  }
};

/**
 * Merge a partial status patch onto the currently-persisted status and write it
 * back atomically. Lets callers update a single field (e.g. lastRun) without
 * reading the whole file first.
 */
export const updateBackupStatus = async (
  patch: Partial<BackupStatus>,
): Promise<BackupStatus> => {
  const current = await readBackupStatus();
  const next: BackupStatus = { ...current, ...patch };
  await writeBackupStatus(next);
  return next;
};