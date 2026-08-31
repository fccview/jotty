export type BackupSchedulePreset =
  | "disabled"
  | "hourly"
  | "every6h"
  | "every12h"
  | "daily"
  | "weekly";

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
  keepDaily: number;
  keepWeekly: number;
}

export interface BackupSnapshot {
  id: string;
  short_id: string;
  time: string;
  paths: string[];
  hostname: string;
  username: string;
  tags: string[];
}

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

export interface BackupRunResult {
  success: boolean;
  snapshotId: string | null;
  message: string;
  durationMs: number;
}

export interface SanitisedBackupConfig {
  enabled: boolean;
  endpoint: string;
  bucket: string;
  region: string;
  prefix: string;
  accessKey: string;
  hasSecretKey: boolean;
  hasRepoPassword: boolean;
  schedule: BackupSchedulePreset;
  keepDaily: number;
  keepWeekly: number;
}

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

export const SCHEDULE_INTERVAL_MS: Record<BackupSchedulePreset, number> = {
  disabled: 0,
  hourly: 60 * 60 * 1000,
  every6h: 6 * 60 * 60 * 1000,
  every12h: 12 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};