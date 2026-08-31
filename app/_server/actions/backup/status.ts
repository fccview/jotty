import fs from "fs/promises";
import path from "path";
import { BackupStatus, DEFAULT_BACKUP_STATUS } from "@/app/_types/backup";
import { BACKUP_STATUS_FILE } from "@/app/_consts/backup";

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
    }
    throw err;
  }
};

export const updateBackupStatus = async (
  patch: Partial<BackupStatus>,
): Promise<BackupStatus> => {
  const current = await readBackupStatus();
  const next: BackupStatus = { ...current, ...patch };
  await writeBackupStatus(next);
  return next;
};