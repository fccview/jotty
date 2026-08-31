import path from "path";

export const BACKUP_SOURCE_DIR = path.join(process.cwd(), "data");

export const BACKUP_STATUS_FILE = path.join("data", "backup-status.json");

export const BACKUP_LANE = "backup-ops";

export const RESTIC_BIN_ENV = "RESTIC_BIN";

export const RESTIC_BIN_DEFAULT = "restic";

export const RESTORE_TEMP_PREFIX = "data.restore-tmp";

export const RESTORE_PREVIOUS_PREFIX = "data.pre-restore";