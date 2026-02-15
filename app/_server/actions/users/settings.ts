"use server";

import { USERS_FILE } from "@/app/_consts/files";
import { readJsonFile, writeJsonFile } from "../file";
import { Result, User } from "@/app/_types";
import { logUserEvent, logAudit } from "@/app/_server/actions/log";
import { getUserIndex } from "./helpers";
import { getCurrentUser } from "./queries";

export const updateUserSettings = async (
  settings: Partial<User>
): Promise<Result<{ user: User }>> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      await logUserEvent("user_settings_updated", "unknown", false, { error: "Not authenticated" });
      return { success: false, error: "Not authenticated" };
    }

    const allUsers = await readJsonFile(USERS_FILE);
    const userIndex = await getUserIndex(currentUser.username);

    const updates: Partial<User> = {};
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined) {
        (updates as any)[key] = value;
      }
    }

    const updatedUser: User = {
      ...allUsers[userIndex],
      ...updates,
    };

    allUsers[userIndex] = updatedUser;
    await writeJsonFile(allUsers, USERS_FILE);

    await logAudit({
      level: "INFO",
      action: "user_settings_updated",
      category: "settings",
      success: true,
      metadata: {
        changes: Object.keys(updates),
        settingsUpdated: updates,
      },
    });

    return { success: true, data: { user: updatedUser } };
  } catch (error) {
    console.error("Error updating user settings:", error);
    await logAudit({
      level: "ERROR",
      action: "user_settings_updated",
      category: "settings",
      success: false,
      errorMessage: "Failed to update user settings",
    });
    return { success: false, error: "Failed to update user settings" };
  }
};
