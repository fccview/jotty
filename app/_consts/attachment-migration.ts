export const MIGRATION_PASSES_MAX = 5;
export const MIGRATIONS_DIR_NAME = ".migrations";
export const ATTACHMENTS_JOURNAL = "attachments-v3.jsonl";
export const ATTACHMENTS_RUN_LOCK = "attachments-migration";
export const LINK_PROBE_PREFIX = ".jotty-link-probe-";

export enum ResidueKinds {
  ENCRYPTED = "encrypted",
  LOCKED = "locked",
  READ_ONLY = "readOnly",
  CLASH = "clash",
  UNPARSABLE = "unparsable",
  MISSING = "missing",
  NOT_FILE = "notFile",
  CROSS_OWNER = "crossOwner",
  FOREIGN = "foreign",
  LOOSE = "loose",
  CHANGING = "changing",
  AVATAR_MISSING = "avatarMissing",
  AVATAR_FOREIGN = "avatarForeign",
}

export enum LinkModes {
  LINK = "link",
  COPY = "copy",
}

export enum MigrationSteps {
  SHARING = "sharing",
  ATTACHMENTS = "attachments",
}
