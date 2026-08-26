import { USERS_FILE } from "@/app/_consts/files";
import { readJsonFile } from "../file";
import { User } from "@/app/_types";
import { getSessionId, readSessions } from "../session";

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
