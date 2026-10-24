import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { USERS_FILE } from "@/app/_consts/files";
import { readJsonFile, writeJsonFile } from "../file";
import { User } from "@/app/_types";
import { getSessionId, readSessions } from "../session/store";
import { withFileLock } from "../lib/file-lock";

export const touchUsersFile = async (): Promise<string> => {
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

const readUsersForWrite = async (usersPath: string): Promise<unknown> => {
  const users = await readJsonFile(USERS_FILE);
  if (users !== null) return users;
  const raw = await fs.readFile(usersPath, "utf-8");
  return raw.trim() ? null : [];
};

/**
 * Every read-modify-write of the users file goes through here. The mutator sees
 * the freshest records while the lock is held; returning null aborts the write.
 */
export const mutateUsers = async <T>(
  mutator: (users: User[]) => Promise<T | null> | T | null,
): Promise<T | null> => {
  try {
    const usersPath = await touchUsersFile();
    return await withFileLock(usersPath, async () => {
      const allUsers = await readUsersForWrite(usersPath);

      if (!Array.isArray(allUsers)) return null;

      const outcome = await mutator(allUsers);

      if (outcome === null) return null;

      await writeJsonFile(allUsers, USERS_FILE);

      return outcome;
    });
  } catch (error) {
    console.error("Failed to update user record:", error);
    return null;
  }
};

export const patchUserFields = async (
  username: string,
  updates: Partial<User>,
  cleared: ReadonlyArray<keyof User> = [],
): Promise<User | null> => {
  if (!username) return null;

  return mutateUsers((allUsers) => {
    const userIndex = allUsers.findIndex(
      (user: User) => user.username === username,
    );

    if (userIndex === -1) return null;

    const updatedUser: User = { ...allUsers[userIndex], ...updates };
    cleared.forEach((key) => delete updatedUser[key]);
    allUsers[userIndex] = updatedUser;

    return updatedUser;
  });
};

export const ensureUserUuid = async (username: string): Promise<string | null> => {
  if (!username) return null;

  return mutateUsers((allUsers) => {
    const user = allUsers.find((candidate: User) => candidate.username === username);
    if (!user) return null;

    user.uuid ||= randomUUID();
    return user.uuid;
  });
};

export const backfillUserUuids = async (): Promise<number | null> =>
  mutateUsers((allUsers) => {
    let stamped = 0;
    allUsers.forEach((user: User) => {
      if (user.uuid) return;
      user.uuid = randomUUID();
      stamped++;
    });
    return stamped;
  });
