"use server";

import { USERS_FILE } from "@/app/_consts/files";
import { readJsonFile } from "../file";
import { Result, User } from "@/app/_types";
import { getSessionId, readSessions } from "../session";
import { ItemTypes } from "@/app/_types/enums";
import { getUserByItem, getUserByItemUuid } from "./helpers";

export const getUserByUsername = async (
  username: string
): Promise<User | null> => {
  const allUsers = await readJsonFile(USERS_FILE);
  return allUsers.find((user: User) => user.username === username) || null;
};

export const getCurrentUser = async (
  username?: string
): Promise<User | null> => {
  const sessionId = await getSessionId();
  const sessions = await readSessions();
  const currentUsername = sessions[sessionId || ""];

  if (!currentUsername && !username) return null;

  return (await getUserByUsername(currentUsername || username || "")) || null;
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

export const getUserByNoteUuid = async (
  uuid: string
): Promise<Result<User>> => {
  return getUserByItemUuid(uuid, ItemTypes.NOTE);
};

export const getUserByChecklistUuid = async (
  uuid: string
): Promise<Result<User>> => {
  return getUserByItemUuid(uuid, ItemTypes.CHECKLIST);
};

export const getUserByChecklist = async (
  checklistID: string,
  checklistCategory: string
): Promise<Result<User>> => {
  return getUserByItem(checklistID, checklistCategory, ItemTypes.CHECKLIST);
};

export const getUserByNote = async (
  noteID: string,
  noteCategory: string
): Promise<Result<User>> => {
  return getUserByItem(noteID, noteCategory, ItemTypes.NOTE);
};
