import path from "path";

/** The directory that gets backed up — the whole app data tree. */
export const BACKUP_SOURCE_DIR = path.join(process.cwd(), "data");

/** Where the backup subsystem persists its runtime status. */
export const BACKUP_STATUS_FILE = path.join("data", "backup-status.json");

/** Concurrency lane for backup operations (runQueued key). */
export const BACKUP_LANE = "backup-ops";

/**
 * Override the restic binary path via env. Falls back to `restic` on PATH.
 * Useful for Docker images that install restic in a non-standard location.
 */
export const RESTIC_BIN_ENV = "RESTIC_BIN";

/** Default binary name resolved against PATH when no override is set. */
export const RESTIC_BIN_DEFAULT = "restic";

/** Where restore lands content before being swapped into `data/`. */
export const RESTORE_TEMP_PREFIX = "data.restore-tmp";

/** Prefix used when renaming the current data dir aside before a restore swap. */
export const RESTORE_PREVIOUS_PREFIX = "data.pre-restore";