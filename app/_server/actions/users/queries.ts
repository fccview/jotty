"use server";

import { USERS_FILE } from "@/app/_consts/files";
import { readJsonFile } from "../file";
import { PublicUserInfo, Result, SanitisedUser, User } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { getUserByItemUuid } from "./helpers";
import { findUserRecord, getCurrentUserRecord } from "./records";
import { isAdmin } from "./auth";
import {
  sanitizeUserForClient,
  toPublicUser,
} from "@/app/_utils/user-sanitize-utils";

export const getPublicUser = async (
  username: string
): Promise<PublicUserInfo | null> => {
  return toPublicUser(await findUserRecord(username));
};

export const getCurrentUser = async (): Promise<SanitisedUser | null> => {
  return sanitizeUserForClient(await getCurrentUserRecord());
};

export const hasUsers = async (): Promise<boolean> => {
  try {
    const users = await readJsonFile(USERS_FILE);
    return users.length > 0;
  } catch (error) {
    return false;
  }
};

export const getUsername = async (): Promise<string> => {
  const user = await getCurrentUser();
  return user?.username || "";
};

export const getUsers = async () => {
  const users = (await readJsonFile(USERS_FILE)) || [];

  if (!users || !Array.isArray(users)) {
    return [];
  }

  return users.map(({ username, isAdmin, isSuperAdmin, avatarUrl }: User) => ({
    username,
    isAdmin,
    isSuperAdmin,
    avatarUrl,
  }));
};

export const getUsersForAdmin = async (): Promise<SanitisedUser[]> => {
  if (!(await isAdmin())) return [];

  const users = (await readJsonFile(USERS_FILE)) || [];
  if (!Array.isArray(users)) return [];

  return users
    .map((u: User) => sanitizeUserForClient(u))
    .filter((u): u is SanitisedUser => u !== null);
};

export const getUserByNoteUuid = async (
  uuid: string
): Promise<Result<PublicUserInfo>> => {
  return getUserByItemUuid(uuid, ItemTypes.NOTE);
};

export const getUserByChecklistUuid = async (
  uuid: string
): Promise<Result<PublicUserInfo>> => {
  return getUserByItemUuid(uuid, ItemTypes.CHECKLIST);
};
