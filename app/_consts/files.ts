import path from "path";

import { CHECKLISTS_FOLDER } from "./checklists";
import { NOTES_FOLDER } from "./notes";

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
