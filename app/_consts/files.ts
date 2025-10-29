import path from "path";

import { CHECKLISTS_FOLDER } from "./checklists";
import { NOTES_FOLDER } from "./notes";

export const ARCHIVED_DIR_NAME = ".archive";
export const EXCLUDED_DIRS = ["images", "files"];

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/avi",
  "video/mov",
  "video/quicktime",
];

export const SHARING_DIR = path.join("data", "sharing");
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
export const SHARED_ITEMS_FILE = path.join(SHARING_DIR, "shared-items.json");
export const EXPORT_TEMP_DIR = path.join(DATA_DIR, "temp_exports");
