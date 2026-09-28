"use server";

import { randomBytes, timingSafeEqual } from "crypto";
import { USERS_FILE } from "@/app/_consts/files";
import { readJsonFile } from "../file";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getCurrentUserRecord, mutateUsers } from "@/app/_server/actions/users/records";
import { Result, User } from "@/app/_types";

const API_KEY_PREFIX = "ck_";
const API_KEY_BYTES = 16;

const _sameKey = (stored: string | undefined, given: string): boolean => {
  if (!stored) return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const generateApiKey = async (): Promise<Result<string>> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    const newApiKey = await mutateUsers((users) => {
      const userIndex = users.findIndex(
        (u: User) => u.username === currentUser.username
      );

      if (userIndex === -1) return null;

      const apiKey = `${API_KEY_PREFIX}${randomBytes(API_KEY_BYTES).toString("hex")}`;

      users[userIndex].apiKey = apiKey;

      return apiKey;
    });

    if (!newApiKey) {
      return { success: false, error: "Failed to generate API key" };
    }

    return { success: true, data: newApiKey };
  } catch (error) {
    console.error("Error generating API key:", error);
    return { success: false, error: "Failed to generate API key" };
  }
};

export const getApiKey = async (): Promise<Result<string | null>> => {
  try {
    const currentUser = await getCurrentUserRecord();
    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    return { success: true, data: currentUser.apiKey || null };
  } catch (error) {
    console.error("Error getting API key:", error);
    return { success: false, error: "Failed to get API key" };
  }
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
