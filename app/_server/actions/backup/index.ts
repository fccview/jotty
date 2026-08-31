"use server";

import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  BackupConfig,
  BackupSnapshot,
  BackupStatus,
  BackupRunResult,
  SanitisedBackupConfig,
  DEFAULT_BACKUP_STATUS,
} from "@/app/_types/backup";
import { Result } from "@/app/_types";
import { isAdmin } from "@/app/_server/actions/users";
import { logAudit } from "@/app/_server/actions/log";
import { getSettings } from "@/app/_server/actions/config/settings";
import { runQueued } from "@/app/_server/actions/lib/concurrency";
import {
  BACKUP_SOURCE_DIR,
  BACKUP_LANE,
  RESTORE_TEMP_PREFIX,
  RESTORE_PREVIOUS_PREFIX,
  BACKUP_STATUS_FILE,
} from "@/app/_consts/backup";
import {
  resticAvailable,
  resticBackup,
  resticCheck,
  resticForget,
  resticInit,
  resticRestore,
  resticSnapshots,
  withDefaults,
} from "./restic";
import { readBackupStatus, updateBackupStatus, writeBackupStatus } from "./status";
import { rearmSchedulerFromSettings } from "./scheduler";
import { dropByPrefix } from "@/app/_server/actions/lib/metadata-cache";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { getCurrentUser } from "@/app/_server/actions/users";

const DATA_SETTINGS_PATH = path.join(process.cwd(), "data", "settings.json");

const maskSecret = (value: string | undefined): string =>
  value && value.length > 0 ? "••••••••" : "";

export const getRawBackupConfig = async (): Promise<BackupConfig> => {
  const settings = await getSettings();
  return withDefaults(settings.backup);
};

export const getBackupConfig = async (): Promise<Result<SanitisedBackupConfig>> => {
  const admin = await isAdmin();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }
  const config = await getRawBackupConfig();
  const sanitised: SanitisedBackupConfig = {
    enabled: config.enabled,
    endpoint: config.endpoint,
    bucket: config.bucket,
    region: config.region,
    prefix: config.prefix,
    accessKey: config.accessKey ? maskSecret(config.accessKey) : "",
    hasSecretKey: Boolean(config.secretKey),
    hasRepoPassword: Boolean(config.repoPassword),
    schedule: config.schedule,
    keepDaily: config.keepDaily,
    keepWeekly: config.keepWeekly,
  };
  return { success: true, data: sanitised };
};

export const saveBackupConfig = async (
  patch: Partial<BackupConfig>,
): Promise<Result<BackupConfig>> => {
  const admin = await isAdmin();
  if (!admin) {
    await logAudit({
      level: "WARNING",
      action: "backup_config_updated",
      category: "backup",
      success: false,
      errorMessage: "Unauthorized: Admin access required",
    });
    return { success: false, error: "Unauthorized: Admin access required" };
  }

  try {
    const result = await runQueued("app-settings", async () => {
      const settings = await getSettings();
      const existing = withDefaults(settings.backup);

      const merged: BackupConfig = {
        ...existing,
        ...patch,
        secretKey:
          patch.secretKey && patch.secretKey.trim().length > 0 && !patch.secretKey.startsWith("•")
            ? patch.secretKey
            : existing.secretKey,
        repoPassword:
          patch.repoPassword && patch.repoPassword.trim().length > 0 && !patch.repoPassword.startsWith("•")
            ? patch.repoPassword
            : existing.repoPassword,
      };

      const dataDir = path.dirname(DATA_SETTINGS_PATH);
      try {
        await fs.access(dataDir);
      } catch {
        await fs.mkdir(dataDir, { recursive: true });
      }

      await fs.writeFile(
        DATA_SETTINGS_PATH,
        JSON.stringify({ ...settings, backup: merged }, null, 2),
      );
      return merged;
    });

    await logAudit({
      level: "INFO",
      action: "backup_config_updated",
      category: "backup",
      success: true,
      metadata: {
        enabled: result.enabled,
        endpoint: result.endpoint,
        bucket: result.bucket,
        schedule: result.schedule,
        hasSecretKey: Boolean(result.secretKey),
        hasRepoPassword: Boolean(result.repoPassword),
      },
    });

    try {
      await rearmSchedulerFromSettings();
    } catch (err) {
      console.error("[backup] failed to re-arm scheduler after config save:", err);
    }

    revalidatePath("/settings/admin/backup");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error saving backup config:", error);
    await logAudit({
      level: "ERROR",
      action: "backup_config_updated",
      category: "backup",
      success: false,
      errorMessage: "Failed to save backup config",
    });
    return { success: false, error: "Failed to save backup config" };
  }
};

export const getBackupStatus = async (): Promise<Result<BackupStatus>> => {
  const admin = await isAdmin();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }
  const persisted = await readBackupStatus();
  const availability = await resticAvailable();
  const status: BackupStatus = {
    ...DEFAULT_BACKUP_STATUS,
    ...persisted,
    resticAvailable: availability.available,
    resticVersion: availability.version,
  };
  return { success: true, data: status };
};

export const runBackupNow = async (): Promise<Result<BackupRunResult>> => {
  const admin = await isAdmin();
  if (!admin) {
    return { success: false, error: "Unauthorized: Admin access required" };
  }

  const config = await getRawBackupConfig();
  if (!config.endpoint || !config.bucket) {
    return { success: false, error: "Backup repository not configured" };
  }
  if (!config.repoPassword) {
    return { success: false, error: "Repository password is required" };
  }

  const availability = await resticAvailable();
  if (!availability.available) {
    return {
      success: false,
      error: availability.error || "restic is not installed",
    };
  }

  const startedAt = Date.now();
  try {
    const result = await runQueued(BACKUP_LANE, () =>
      resticBackup(config, BACKUP_SOURCE_DIR),
    );
    const durationMs = Date.now() - startedAt;

    if (result.success) {
      await resticForget(config, config.keepDaily, config.keepWeekly);
      const snapshots = await resticSnapshots(config);
      await updateBackupStatus({
        lastRun: new Date(startedAt).toISOString(),
        lastSuccess: new Date(startedAt).toISOString(),
        lastError: null,
        lastSnapshotId: result.snapshotId,
        snapshotCount: snapshots.length,
      });
      await logAudit({
        level: "INFO",
        action: "backup_created",
        category: "backup",
        success: true,
        duration: durationMs,
        metadata: { snapshotId: result.snapshotId },
      });
      return {
        success: true,
        data: {
          success: true,
          snapshotId: result.snapshotId,
          message: result.message,
          durationMs,
        },
      };
    }

    await updateBackupStatus({
      lastRun: new Date(startedAt).toISOString(),
      lastError: result.message,
    });
    await logAudit({
      level: "ERROR",
      action: "backup_failed",
      category: "backup",
      success: false,
      duration: durationMs,
      errorMessage: result.message,
    });
    return { success: false, error: result.message };
  } catch (error: any) {
    const durationMs = Date.now() - startedAt;
    const message = error?.message || "Backup failed";
    await updateBackupStatus({
      lastRun: new Date(startedAt).toISOString(),
      lastError: message,
    });
    await logAudit({
      level: "ERROR",
      action: "backup_failed",
      category: "backup",
      success: false,
      duration: durationMs,
      errorMessage: message,
    });
    return { success: false, error: message };
  }
};

export const listSnapshots = async (): Promise<Result<BackupSnapshot[]>> => {
  const admin = await isAdmin();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }
  const config = await getRawBackupConfig();
  if (!config.endpoint || !config.bucket || !config.repoPassword) {
    return { success: true, data: [] };
  }
  const snapshots = await resticSnapshots(config);
  await updateBackupStatus({ snapshotCount: snapshots.length });
  return { success: true, data: snapshots };
};

export const checkRepository = async (): Promise<Result<string>> => {
  const admin = await isAdmin();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }
  const config = await getRawBackupConfig();
  if (!config.endpoint || !config.bucket) {
    return { success: false, error: "Repository endpoint and bucket are required" };
  }
  if (!config.repoPassword) {
    return { success: false, error: "Repository password is required" };
  }

  const availability = await resticAvailable();
  if (!availability.available) {
    return { success: false, error: availability.error || "restic is not installed" };
  }

  const initResult = await resticInit(config);
  if (!initResult.success) {
    await logAudit({
      level: "WARNING",
      action: "backup_repository_checked",
      category: "backup",
      success: false,
      errorMessage: initResult.message,
    });
    return { success: false, error: initResult.message };
  }

  const checkResult = await resticCheck(config);
  await logAudit({
    level: checkResult.success ? "INFO" : "WARNING",
    action: "backup_repository_checked",
    category: "backup",
    success: checkResult.success,
    metadata: { message: checkResult.message },
    errorMessage: checkResult.success ? undefined : checkResult.message,
  });
  if (!checkResult.success) {
    return { success: false, error: checkResult.message };
  }
  return { success: true, data: checkResult.message };
};

export const restoreBackup = async (
  snapshotId: string,
): Promise<Result<{ rollbackDir: string; message: string }>> => {
  const admin = await isAdmin();
  if (!admin) {
    return { success: false, error: "Unauthorized: Admin access required" };
  }
  if (!snapshotId || typeof snapshotId !== "string") {
    return { success: false, error: "Snapshot id is required" };
  }

  const config = await getRawBackupConfig();
  if (!config.endpoint || !config.bucket || !config.repoPassword) {
    return { success: false, error: "Repository not fully configured" };
  }

  const availability = await resticAvailable();
  if (!availability.available) {
    return { success: false, error: availability.error || "restic is not installed" };
  }

  const cwd = process.cwd();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const tempRestoreDir = path.join(cwd, `${RESTORE_TEMP_PREFIX}-${timestamp}`);
  const rollbackDir = path.join(cwd, `${RESTORE_PREVIOUS_PREFIX}-${timestamp}`);
  const dataDir = path.join(cwd, "data");
  
  const preRestoreStatus = await readBackupStatus();

  try {
    const restoreResult = await resticRestore(config, snapshotId, tempRestoreDir);
    if (!restoreResult.success) {
      throw new Error(restoreResult.message);
    }

    const restoredDataDir = path.join(tempRestoreDir, "data");
    let restoredExists = false;
    try {
      await fs.access(restoredDataDir);
      restoredExists = true;
    } catch {
      restoredExists = false;
    }

    if (!restoredExists) {
      throw new Error(
        "Restored content did not contain a 'data' directory; aborting swap to avoid data loss.",
      );
    }

    await fs.rename(dataDir, rollbackDir);

    try {
      await fs.rename(restoredDataDir, dataDir);
    } catch (moveErr) {
      try {
        await fs.rename(rollbackDir, dataDir);
      } catch {
      }
      throw moveErr;
    }

    await fs.rm(tempRestoreDir, { recursive: true, force: true });

    await logAudit({
      level: "INFO",
      action: "backup_restored",
      category: "backup",
      success: true,
      metadata: { snapshotId, rollbackDir: path.basename(rollbackDir) },
    });

    const availability = await resticAvailable();
    let snapshotCount = preRestoreStatus.snapshotCount;
    try {
      const snapshots = await resticSnapshots(config);
      snapshotCount = snapshots.length;
    } catch {
    }
    await writeBackupStatus({
      ...DEFAULT_BACKUP_STATUS,
      ...preRestoreStatus,
      lastRun: new Date().toISOString(),
      lastError: null,
      snapshotCount,
      resticAvailable: availability.available,
      resticVersion: availability.version,
    });

    try {
      await rearmSchedulerFromSettings();
    } catch (err) {
      console.error("[backup] failed to re-arm scheduler after restore:", err);
    }

    dropByPrefix("checklists-meta:");
    dropByPrefix("notes-meta:");

    revalidatePath("/");
    revalidatePath("/admin");
    revalidateTag("layout-notes", { expire: 0 });
    revalidateTag("layout-checklists", { expire: 0 });

    try {
      const currentUser = await getCurrentUser();
      await broadcast({
        type: "settings",
        action: "updated",
        username: currentUser?.username || "system",
      });
    } catch {
    }

    return {
      success: true,
      data: {
        rollbackDir: path.basename(rollbackDir),
        message: `Restored snapshot ${snapshotId.slice(0, 8)}. Previous data kept at ${path.basename(rollbackDir)}.`,
      },
    };
  } catch (error: any) {
    const message = error?.message || "Restore failed";
    await logAudit({
      level: "ERROR",
      action: "backup_restored",
      category: "backup",
      success: false,
      errorMessage: message,
      metadata: { snapshotId },
    });
    try {
      await fs.rm(tempRestoreDir, { recursive: true, force: true });
    } catch {
    }
    return { success: false, error: message };
  }
};

export const initRepository = async (): Promise<Result<string>> => {
  const admin = await isAdmin();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }
  const config = await getRawBackupConfig();
  if (!config.endpoint || !config.bucket) {
    return { success: false, error: "Repository endpoint and bucket are required" };
  }
  if (!config.repoPassword) {
    return { success: false, error: "Repository password is required" };
  }
  const availability = await resticAvailable();
  if (!availability.available) {
    return { success: false, error: availability.error || "restic is not installed" };
  }
  const result = await resticInit(config);
  await logAudit({
    level: result.success ? "INFO" : "WARNING",
    action: "backup_repository_checked",
    category: "backup",
    success: result.success,
    metadata: { message: result.message },
  });
  if (!result.success) {
    return { success: false, error: result.message };
  }
  return { success: true, data: result.message };
};