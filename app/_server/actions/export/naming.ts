import path from "path";
import { randomBytes } from "crypto";
import { EXPORT_TEMP_DIR } from "@/app/_consts/files";
import { findUserRecord } from "@/app/_server/actions/users/records";
import { isPathSafe, validateNoPathTraversal } from "@/app/_utils/path-utils";

export const EXPORT_TOKEN_BYTES = 16;
export const SESSION_ONLY_EXPORT_PREFIXES = ["all_users_data_", "whole_data_folder_"];

export const exportName = (prefix: string): string =>
  `${prefix}_${Date.now()}_${randomBytes(EXPORT_TOKEN_BYTES).toString("hex")}.zip`;

export const exportableUser = async (username: string): Promise<boolean> =>
  Boolean(username) &&
  validateNoPathTraversal(username) &&
  !username.startsWith(".") &&
  isPathSafe(path.join(process.cwd(), EXPORT_TEMP_DIR), username) &&
  Boolean(await findUserRecord(username));
