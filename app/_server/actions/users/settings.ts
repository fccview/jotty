"use server";

import {
  EDITABLE_SETTING_KEYS,
  EDITABLE_ENCRYPTION_KEYS,
} from "@/app/_consts/user-settings";
import { Result, SanitisedUser, User, EncryptionSettings } from "@/app/_types";
import { logUserEvent, logAudit } from "@/app/_server/actions/log";
import { getCurrentUser } from "./queries";
import { getCurrentUserRecord, patchUserFields } from "./records";
import { sanitizeUserForClient } from "@/app/_utils/user-sanitize-utils";

const keepAllowed = (
  settings: Partial<User>,
  stored: User,
): Partial<User> => {
  const allowed: Partial<User> = {};

  for (const key of EDITABLE_SETTING_KEYS) {
    const value = settings[key];
    if (value !== undefined) {
      (allowed[key] as unknown) = value;
    }
  }

  if (settings.encryptionSettings) {
    allowed.encryptionSettings = mergeCrypto(
      settings.encryptionSettings,
      stored.encryptionSettings,
    );
  }

  return allowed;
};

const mergeCrypto = (
  incoming: EncryptionSettings,
  stored?: EncryptionSettings,
): EncryptionSettings => {
  const merged = { ...stored } as EncryptionSettings;

  for (const key of EDITABLE_ENCRYPTION_KEYS) {
    const value = incoming[key];
    if (value !== undefined) {
      (merged[key] as unknown) = value;
    }
  }

  merged.customKeyPath = stored?.customKeyPath;

  return merged;
};

export const updateUserSettings = async (
  settings: Partial<User>
): Promise<Result<{ user: SanitisedUser }>> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      await logUserEvent("user_settings_updated", "unknown", false, { error: "Not authenticated" });
      return { success: false, error: "Not authenticated" };
    }

    const storedUser = await getCurrentUserRecord();
    if (!storedUser) {
      return { success: false, error: "Not authenticated" };
    }

    const updates = keepAllowed(settings, storedUser);
    const rejected = Object.keys(settings).filter(
      (key) => !(key in updates) && settings[key as keyof User] !== undefined
    );

    if (rejected.length > 0) {
      await logAudit({
        level: "WARNING",
        action: "user_settings_rejected",
        category: "settings",
        success: false,
        errorMessage: "Attempted to update non-editable fields",
        metadata: { username: currentUser.username, rejected },
      });
    }

    const updatedUser = await patchUserFields(currentUser.username, updates);

    if (!updatedUser) {
      return { success: false, error: "Failed to update user settings" };
    }

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

    return { success: true, data: { user: sanitizeUserForClient(updatedUser)! } };
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
