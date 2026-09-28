import { timingSafeEqual } from "crypto";
import { USERS_FILE } from "@/app/_consts/files";
import { readJsonFile } from "../file";
import { User } from "@/app/_types";

const _sameKey = (stored: string | undefined, given: string): boolean => {
  if (!stored) return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const authenticateApiKey = async (
  apiKey: string
): Promise<User | null> => {
  try {
    if (!apiKey) {
      return null;
    }

    const users: User[] = await readJsonFile(USERS_FILE);
    return users.find((u) => _sameKey(u.apiKey, apiKey)) || null;
  } catch (error) {
    console.error("Error authenticating API key:", error);
    return null;
  }
};
