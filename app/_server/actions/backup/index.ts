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

/** Path to the persisted settings file (same as the config action uses). */
const DATA_SETTINGS_PATH = path.join(process.cwd(), "data", "settings.json");

/** Mask a secret for read-back: returns a fixed bullet string when set. */
const maskSecret = (value: string | undefined): string =>
  value && value.length > 0 ? "••••••••" : "";

/**
 * Read the persisted backup config (merged with defaults). Not admin-guarded —
 * the scheduler calls this internally. The admin-facing reader is
 * `getBackupConfig` which sanitises secrets.
 */
export const getRawBackupConfig = async (): Promise<BackupConfig> => {
  const settings = await getSettings();
  return withDefaults(settings.backup);
};

/**
 * Return a sanitised backup config to the admin UI. Secrets (secretKey,
 * repoPassword) are replaced with a bullet mask; the UI gets boolean flags
 * indicating whether they are set so it can render "configured" state without
 * ever holding the raw values.
 */
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

/**
 * Persist a backup config patch onto the existing settings.json. Secret
 * fields are handled specially: when the submitted value is the bullet mask
 * (or empty), the existing secret is preserved so the admin can change other
 * fields without re-entering the secret each time.
 */
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

      // Preserve existing secrets when the submitted value is empty or masked.
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
        // Never log secrets.
        hasSecretKey: Boolean(result.secretKey),
        hasRepoPassword: Boolean(result.repoPassword),
      },
    });

    // Re-arm the scheduler so the new schedule takes effect immediately.
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

/**
 * Return the current backup status (last run, next run, restic availability)
 * merged with a fresh restic availability probe so the UI is never stale.
 */
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

/**
 * Run a backup immediately (manual "Backup now"). Admin-only. Runs restic
 * backup + retention + snapshot refresh, records status, and logs audit.
 */
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

/**
 * List snapshots in the configured repository, newest first. Admin-only.
 * Returns an empty array on read errors so the UI degrades gracefully.
 */
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

/**
 * Verify the repository is reachable and credentials are valid
 * (`restic check`). Also initialises the repo if it doesn't exist yet, so the
 * admin can run "Test connection" against a fresh bucket. Admin-only.
 */
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

  // Try to init first (idempotent), then check.
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

/**
 * Restore a snapshot using the safe-swap strategy: restic restores into a temp
 * dir, the current `data/` is renamed aside as `data.pre-restore-<ts>`, and the
 * restored content is moved into place. The pre-restore folder is kept as a
 * rollback. Admin-only.
 */
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

  try {
    // 1. Restore into a temp dir.
    const restoreResult = await resticRestore(config, snapshotId, tempRestoreDir);
    if (!restoreResult.success) {
      throw new Error(restoreResult.message);
    }

    // restic restores the backed-up tree into the target. Since we back up
    // `data/` using a relative path (cwd = parent dir), the snapshot root is
    // `data/`, so restic recreates `data/` inside the target:
    // <tempRestoreDir>/data/...
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

    // 2. Rename current data/ aside (rollback).
    await fs.rename(dataDir, rollbackDir);

    // 3. Move restored data/ into place.
    try {
      await fs.rename(restoredDataDir, dataDir);
    } catch (moveErr) {
      // If the move fails, attempt to roll back to the previous data dir.
      try {
        await fs.rename(rollbackDir, dataDir);
      } catch {
        /* rollback failed — surface original error */
      }
      throw moveErr;
    }

    // 4. Clean up the temp dir (keep the rollback dir).
    await fs.rm(tempRestoreDir, { recursive: true, force: true });

    await logAudit({
      level: "INFO",
      action: "backup_restored",
      category: "backup",
      success: true,
      metadata: { snapshotId, rollbackDir: path.basename(rollbackDir) },
    });

    // 5. Invalidate caches: the restore swapped the entire data/ directory,
    //    so every cached file listing is stale. Without this the sidebar would
    //    show checklists/notes that no longer exist (or miss restored ones).
    //    The fs.watch watchers were attached to the old data/ path and no longer
    //    fire after the rename swap, so we drop the metadata cache manually.
    dropByPrefix("checklists-meta:");
    dropByPrefix("notes-meta:");

    revalidatePath("/");
    revalidatePath("/admin");
    revalidateTag("layout-notes", { expire: 0 });
    revalidateTag("layout-checklists", { expire: 0 });

    // Broadcast a WS event so connected clients call router.refresh().
    try {
      const currentUser = await getCurrentUser();
      await broadcast({
        type: "settings",
        action: "updated",
        username: currentUser?.username || "system",
      });
    } catch {
      /* WS broadcast is best-effort */
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
    // Best-effort cleanup of the temp dir on failure.
    try {
      await fs.rm(tempRestoreDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    return { success: false, error: message };
  }
};

/**
 * Initialise the restic repository (idempotent). Exposed separately so the UI
 * can offer "Create repository" for a brand-new bucket. Admin-only.
 */
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