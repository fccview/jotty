import { BackupConfig, SCHEDULE_INTERVAL_MS } from "@/app/_types/backup";
import { runQueued } from "@/app/_server/actions/lib/concurrency";
import { updateBackupStatus } from "./status";
import { resticBackup, resticAvailable, resticForget, resticSnapshots, withDefaults } from "./restic";
import { BACKUP_SOURCE_DIR, BACKUP_LANE } from "@/app/_consts/backup";

/**
 * In-process scheduler singleton. Jotty runs as a single Node process, so a
 * module-level timer (guarded by a globalThis flag to survive HMR in dev) is
 * enough to run automatic backups on a preset interval. We deliberately avoid
 * OS cron so the feature works in the Docker image without extra setup.
 *
 * The scheduler is intentionally dumb: every tick it re-reads the current
 * BackupConfig from settings, so an admin changing the schedule (or disabling
 * it) takes effect on the next tick without a restart.
 */

interface SchedulerState {
  timer: NodeJS.Timeout | null;
  intervalMs: number;
}

const globalKey = "__jottyBackupScheduler";
const stateKey = "__jottyBackupSchedulerState";

/** Read the module-level scheduler state, initialising it if needed. */
const getState = (): SchedulerState => {
  if (!(globalThis as any)[stateKey]) {
    (globalThis as any)[stateKey] = { timer: null, intervalMs: 0 } as SchedulerState;
  }
  return (globalThis as any)[stateKey] as SchedulerState;
};

/** Clear any active timer, marking the scheduler as stopped. */
const clearTimer = (): void => {
  const state = getState();
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
  state.intervalMs = 0;
};

/**
 * Run a single backup cycle. Used by the scheduler tick. It records status
 * regardless of outcome.
 */
export const runScheduledBackup = async (
  config: BackupConfig,
): Promise<{ success: boolean; snapshotId: string | null; message: string }> => {
  const startedAt = new Date().toISOString();
  try {
    const result = await runQueued(BACKUP_LANE, () =>
      resticBackup(config, BACKUP_SOURCE_DIR),
    );
    if (result.success) {
      await resticForget(config, config.keepDaily, config.keepWeekly);
      const snapshots = await resticSnapshots(config);
      await updateBackupStatus({
        lastRun: startedAt,
        lastSuccess: startedAt,
        lastError: null,
        lastSnapshotId: result.snapshotId,
        snapshotCount: snapshots.length,
      });
      return result;
    }
    await updateBackupStatus({
      lastRun: startedAt,
      lastError: result.message,
    });
    return result;
  } catch (err: any) {
    const message = err?.message || "Scheduled backup failed";
    await updateBackupStatus({
      lastRun: startedAt,
      lastError: message,
    });
    return { success: false, snapshotId: null, message };
  }
};

/**
 * Schedule the next tick `intervalMs` from now. Uses `setTimeout` (not
 * `setInterval`) so a long-running backup can't overlap with the next tick —
 * the next tick is only armed after the current one finishes.
 */
const armNextTick = (intervalMs: number, fn: () => Promise<void>): void => {
  const state = getState();
  state.intervalMs = intervalMs;
  const nextRun = new Date(Date.now() + intervalMs).toISOString();
  state.timer = setTimeout(() => {
    fn().finally(() => {
      // Re-arm only if the scheduler is still supposed to run at this interval.
      const s = getState();
      if (s.intervalMs === intervalMs && s.timer) {
        armNextTick(intervalMs, fn);
      }
    });
  }, intervalMs);
  // Mark nextRun on the persisted status so the UI can show it.
  void updateBackupStatus({ nextRun, schedulerRunning: true });
};

/**
 * Start (or restart) the scheduler based on the provided config. Safe to call
 * repeatedly — it tears down any existing timer first. When the schedule is
 * `disabled` (interval 0) it simply stops.
 */
export const startBackupScheduler = async (
  config: BackupConfig | undefined,
): Promise<void> => {
  if ((globalThis as any)[globalKey]) {
    // Already initialised once; just re-arm with the latest config below.
  }
  (globalThis as any)[globalKey] = true;

  clearTimer();

  const resolved = withDefaults(config);
  // Probe restic once so the status reflects availability.
  const availability = await resticAvailable();
  const baseStatus = {
    resticAvailable: availability.available,
    resticVersion: availability.version,
  };

  if (!resolved.enabled || resolved.schedule === "disabled") {
    await updateBackupStatus({
      ...baseStatus,
      schedulerRunning: false,
      nextRun: null,
    });
    return;
  }

  const intervalMs = SCHEDULE_INTERVAL_MS[resolved.schedule];
  if (intervalMs <= 0) {
    await updateBackupStatus({
      ...baseStatus,
      schedulerRunning: false,
      nextRun: null,
    });
    return;
  }

  if (!availability.available) {
    await updateBackupStatus({
      ...baseStatus,
      schedulerRunning: false,
      lastError: availability.error || "restic not available",
      nextRun: null,
    });
    return;
  }

  await updateBackupStatus({ ...baseStatus, schedulerRunning: true });
  armNextTick(intervalMs, async () => {
    const fresh = await readCurrentBackupConfig();
    if (!fresh || !fresh.enabled || fresh.schedule === "disabled") {
      return;
    }
    await runScheduledBackup(fresh);
  });
};

/**
 * Stop the scheduler and clear the globalThis flags. Mainly useful for tests.
 */
export const stopBackupScheduler = async (): Promise<void> => {
  clearTimer();
  (globalThis as any)[globalKey] = false;
  await updateBackupStatus({ schedulerRunning: false, nextRun: null });
};

const SETTINGS_PATH = "data/settings.json";

/**
 * Read the current backup config from settings. Kept in the scheduler module
 * (rather than importing the config action) to avoid a circular import: the
 * config action imports the backup barrel which re-exports the scheduler. We
 * read the settings file directly via the same path the config action uses.
 */
export const readCurrentBackupConfig = async (): Promise<BackupConfig | null> => {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(process.cwd(), SETTINGS_PATH);
    const content = await fs.readFile(filePath, "utf-8");
    const settings = JSON.parse(content);
    if (!settings.backup) return null;
    return withDefaults(settings.backup);
  } catch {
    return null;
  }
};

/**
 * Re-arm the scheduler from the currently-persisted settings. Called after the
 * admin saves backup config so the new schedule takes effect immediately.
 */
export const rearmSchedulerFromSettings = async (): Promise<void> => {
  const config = await readCurrentBackupConfig();
  await startBackupScheduler(config || undefined);
};

/** Whether the scheduler has been initialised (for instrumentation guards). */
export const isSchedulerInitialised = (): boolean => Boolean((globalThis as any)[globalKey]);

/** Return the scheduler state for diagnostics/tests. */
export const getSchedulerState = (): SchedulerState => getState();

/** Compute the next-run timestamp for a given interval (exposed for tests). */
export const computeNextRun = (intervalMs: number, from: number = Date.now()): string =>
  new Date(from + intervalMs).toISOString();