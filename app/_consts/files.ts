import path from "path";

import { CHECKLISTS_FOLDER } from "./checklists";
import { NOTES_FOLDER } from "./notes";

export const ARCHIVED_DIR_NAME = ".archive";
export const EXCLUDED_DIRS = ["images", "files", "videos", ".git"];

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const IMAGE_MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

export const ALLOWED_IMAGE_TYPES = Array.from(
  new Set(Object.values(IMAGE_MIME_BY_EXT))
);

export const imageMime = (fileName: string): string | undefined =>
  IMAGE_MIME_BY_EXT[path.extname(fileName).toLowerCase()];

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/avi",
  "video/mov",
  "video/quicktime",
];

export const USERS_DIR = path.join("data", "users");
export const DATA_DIR = path.join("data");
export const HOWTO_DIR = path.join("howto");

export const CHECKLISTS_DIR = (username: string) =>
  path.join(DATA_DIR, CHECKLISTS_FOLDER, username);

export const NOTES_DIR = (username: string) =>
  path.join(DATA_DIR, NOTES_FOLDER, username);

export const USERS_FILE = path.join("data", "users", "users.json");
export const SESSIONS_FILE = path.join(USERS_DIR, "sessions.json");
export const SESSION_DATA_FILE = path.join(USERS_DIR, "session-data.json");
export const EXPORT_TEMP_DIR = path.join(DATA_DIR, "temp_exports");

export const DATA_SCHEMA_VERSION = 2;
export const SCHEMA_VERSION_FILE = path.join(DATA_DIR, ".schema-version");
export const MIGRATION_FORCE_PARAM = "force";
export const MIGRATION_FORCE_VALUE = "1";

export const NOTIFICATIONS_DIR = path.join(DATA_DIR, "notifications");
export const NOTIFICATIONS_FILE = (username: string) =>
  path.join(NOTIFICATIONS_DIR, `${username}.json`);

export const LOGS_DIR = "data/logs";
export const getUserLogsDir = (username: string) =>
  path.join(LOGS_DIR, username);

export const COMMENTS_DIR = (owner: string) =>
  path.join(DATA_DIR, CHECKLISTS_FOLDER, owner, ".comments");
export const COMMENTS_FILE = (owner: string, boardUuid: string) =>
  path.join(COMMENTS_DIR(owner), `${boardUuid}.json`);

export const HOMEPAGE_ITEMS_LIMIT = 12;
export const FILTER_PAGE_SIZE = 20;
