import { lock, unlock } from "proper-lockfile";
import fs from "fs/promises";
import path from "path";
import { USERS_FILE } from "@/app/_consts/files";
import { readJsonFile, writeJsonFile } from "../file";
import { User } from "@/app/_types";
import { getSessionId, readSessions } from "../session";

const LOCK_RETRIES = { retries: 10, minTimeout: 50, maxTimeout: 500 };

const touchUsersFile = async (): Promise<string> => {
  const usersPath = path.join(process.cwd(), USERS_FILE);

  await fs.mkdir(path.dirname(usersPath), { recursive: true });

  try {
    await fs.access(usersPath);
  } catch {
    await fs.writeFile(usersPath, "[]", "utf-8");
  }

  return usersPath;
};

export const findUserRecord = async (
  username: string,
): Promise<User | null> => {
  if (!username) return null;

  const allUsers = await readJsonFile(USERS_FILE);

  if (!Array.isArray(allUsers)) return null;

  return allUsers.find((user: User) => user.username === username) || null;
};

export const getCurrentUserRecord = async (): Promise<User | null> => {
  const sessionId = await getSessionId();
  const sessions = await readSessions();
  const currentUsername = sessions[sessionId || ""];

  if (!currentUsername) return null;

  return findUserRecord(currentUsername);
};

/**
 * Every read-modify-write of the users file goes through here. The mutator sees
 * the freshest records while the lock is held; returning null aborts the write.
 */
export const mutateUsers = async <T>(
  mutator: (users: User[]) => Promise<T | null> | T | null,
): Promise<T | null> => {
  const usersPath = await touchUsersFile();

  try {
    await lock(usersPath, { retries: LOCK_RETRIES });
  } catch (error) {
    console.error("Failed to lock users file for update:", error);
    return null;
  }

  try {
    const allUsers = await readJsonFile(USERS_FILE);

    if (!Array.isArray(allUsers)) return null;

    const outcome = await mutator(allUsers);

    if (outcome === null) return null;

    await writeJsonFile(allUsers, USERS_FILE);

    return outcome;
  } catch (error) {
    console.error("Failed to update user record:", error);
    return null;
  } finally {
    try {
      await unlock(usersPath);
    } catch (error) {
      console.error("Failed to release users file lock:", error);
    }
  }
};

export const patchUserFields = async (
  username: string,
  updates: Partial<User>,
): Promise<User | null> => {
  if (!username) return null;

  return mutateUsers((allUsers) => {
    const userIndex = allUsers.findIndex(
      (user: User) => user.username === username,
    );

    if (userIndex === -1) return null;

    const updatedUser: User = { ...allUsers[userIndex], ...updates };
    allUsers[userIndex] = updatedUser;

    return updatedUser;
  });
};
