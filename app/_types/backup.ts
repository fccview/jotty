/**
 * Preset schedule intervals offered to the admin. We deliberately avoid a
 * free-form cron expression so the in-process scheduler stays simple and we
 * don't pull in a cron parser dependency. The values map to millisecond
 * durations consumed by the scheduler singleton.
 */
export type BackupSchedulePreset =
  | "disabled"
  | "hourly"
  | "every6h"
  | "every12h"
  | "daily"
  | "weekly";

/**
 * S3-compatible repository configuration consumed by the restic wrapper.
 * `endpoint` may point at AWS S3, MinIO, Wasabi, Cloudflare R2, Backblaze B2,
 * etc. `accessKey` and `secretKey` are the S3 credentials; `repoPassword` is
 * the restic repository encryption password (independent of S3 auth).
 *
 * Secrets are persisted in `data/settings.json` (same trust model as the rest
 * of the app settings) and are redacted by the server action on read-back so
 * the UI never receives the raw secret values.
 */
export interface BackupConfig {
  enabled: boolean;
  endpoint: string;
  bucket: string;
  region: string;
  prefix: string;
  accessKey: string;
  secretKey: string;
  repoPassword: string;
  schedule: BackupSchedulePreset;
  /** Keep the last N daily snapshots via `restic forget --keep-daily`. 0 = disabled. */
  keepDaily: number;
  /** Keep the last N weekly snapshots via `restic forget --keep-weekly`. 0 = disabled. */
  keepWeekly: number;
}

/**
 * A restic snapshot as returned by `restic snapshots --json`. We only type the
 * fields we actually surface in the UI; restic may return more.
 */
export interface BackupSnapshot {
  id: string;
  short_id: string;
  time: string;
  paths: string[];
  hostname: string;
  username: string;
  tags: string[];
}

/**
 * Runtime status of the backup subsystem, persisted to
 * `data/backup-status.json` and surfaced in the admin UI.
 */
export interface BackupStatus {
  lastRun: string | null;
  lastSuccess: string | null;
  lastError: string | null;
  lastSnapshotId: string | null;
  snapshotCount: number;
  nextRun: string | null;
  schedulerRunning: boolean;
  resticAvailable: boolean;
  resticVersion: string | null;
}

/**
 * Result of an immediate backup run, returned to the UI.
 */
export interface BackupRunResult {
  success: boolean;
  snapshotId: string | null;
  message: string;
  durationMs: number;
}

/**
 * Sanitised backup config returned by `getBackupConfig`. Secrets are masked
 * so the client never holds the raw credentials.
 */
export interface SanitisedBackupConfig {
  enabled: boolean;
  endpoint: string;
  bucket: string;
  region: string;
  prefix: string;
  accessKey: string;
  /** True when a secret key is configured (value never leaves the server). */
  hasSecretKey: boolean;
  /** True when a repo password is configured (value never leaves the server). */
  hasRepoPassword: boolean;
  schedule: BackupSchedulePreset;
  keepDaily: number;
  keepWeekly: number;
}

/** Default backup config used when none is persisted yet. */
export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  enabled: false,
  endpoint: "",
  bucket: "",
  region: "",
  prefix: "jotty",
  accessKey: "",
  secretKey: "",
  repoPassword: "",
  schedule: "disabled",
  keepDaily: 7,
  keepWeekly: 4,
};

/** Default empty status used before the first run. */
export const DEFAULT_BACKUP_STATUS: BackupStatus = {
  lastRun: null,
  lastSuccess: null,
  lastError: null,
  lastSnapshotId: null,
  snapshotCount: 0,
  nextRun: null,
  schedulerRunning: false,
  resticAvailable: false,
  resticVersion: null,
};

/**
 * Map a schedule preset to a millisecond interval. `disabled` resolves to 0 so
 * the scheduler can short-circuit.
 */
export const SCHEDULE_INTERVAL_MS: Record<BackupSchedulePreset, number> = {
  disabled: 0,
  hourly: 60 * 60 * 1000,
  every6h: 6 * 60 * 60 * 1000,
  every12h: 12 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};