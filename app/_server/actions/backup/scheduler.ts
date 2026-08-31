import { BackupConfig, SCHEDULE_INTERVAL_MS } from "@/app/_types/backup";
import { runQueued } from "@/app/_server/actions/lib/concurrency";
import { updateBackupStatus } from "./status";
import { resticBackup, resticAvailable, resticForget, resticSnapshots, withDefaults } from "./restic";
import { BACKUP_SOURCE_DIR, BACKUP_LANE } from "@/app/_consts/backup";

interface SchedulerState {
  timer: NodeJS.Timeout | null;
  intervalMs: number;
}

const globalKey = "__jottyBackupScheduler";
const stateKey = "__jottyBackupSchedulerState";

const getState = (): SchedulerState => {
  if (!(globalThis as any)[stateKey]) {
    (globalThis as any)[stateKey] = { timer: null, intervalMs: 0 } as SchedulerState;
  }
  return (globalThis as any)[stateKey] as SchedulerState;
};

const clearTimer = (): void => {
  const state = getState();
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
  state.intervalMs = 0;
};

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

const armNextTick = (intervalMs: number, fn: () => Promise<void>): void => {
  const state = getState();
  state.intervalMs = intervalMs;
  const nextRun = new Date(Date.now() + intervalMs).toISOString();
  state.timer = setTimeout(() => {
    fn().finally(() => {
      const s = getState();
      if (s.intervalMs === intervalMs && s.timer) {
        armNextTick(intervalMs, fn);
      }
    });
  }, intervalMs);
  void updateBackupStatus({ nextRun, schedulerRunning: true });
};

export const startBackupScheduler = async (
  config: BackupConfig | undefined,
): Promise<void> => {
  (globalThis as any)[globalKey] = true;

  clearTimer();

  const resolved = withDefaults(config);
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

export const stopBackupScheduler = async (): Promise<void> => {
  clearTimer();
  (globalThis as any)[globalKey] = false;
  await updateBackupStatus({ schedulerRunning: false, nextRun: null });
};

const SETTINGS_PATH = "data/settings.json";

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

export const rearmSchedulerFromSettings = async (): Promise<void> => {
  const config = await readCurrentBackupConfig();
  await startBackupScheduler(config || undefined);
};

export const isSchedulerInitialised = (): boolean => Boolean((globalThis as any)[globalKey]);

export const getSchedulerState = (): SchedulerState => getState();

export const computeNextRun = (intervalMs: number, from: number = Date.now()): string =>
  new Date(from + intervalMs).toISOString();