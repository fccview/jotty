"use server";

import {
  EDITABLE_SETTING_KEYS,
  EDITABLE_ENCRYPTION_KEYS,
} from "@/app/_consts/user-settings";
import {
  Result,
  SanitisedUser,
  User,
  EncryptionSettings,
  UserSettingsPatch,
} from "@/app/_types";
import { logUserEvent, logAudit } from "@/app/_server/actions/log";
import { getCurrentUser } from "./queries";
import { getCurrentUserRecord, patchUserFields } from "./records";
import { sanitizeUserForClient } from "@/app/_utils/user-sanitize-utils";
import {
  clampRadius,
  normaliseKanbanColumnWidth,
  normaliseNoteFontSize,
} from "@/app/_consts/styling";
import { VIEW_MODES } from "@/app/_consts/view-modes";
import { broadcast } from "@/app/_server/actions/ws/broadcast";

const TOGGLE_VALUES: ReadonlyArray<unknown> = ["enable", "disable"];

const _isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const _keepOneOf = (
  allowed: Partial<User>,
  key: keyof User,
  values: ReadonlyArray<unknown>,
) => {
  if (allowed[key] !== undefined && !values.includes(allowed[key])) {
    delete allowed[key];
  }
};

const _normaliseLooks = (allowed: Partial<User>) => {
  if (allowed.preferredBorderRadius !== undefined) {
    if (_isFiniteNumber(allowed.preferredBorderRadius)) {
      allowed.preferredBorderRadius = clampRadius(allowed.preferredBorderRadius);
    } else {
      delete allowed.preferredBorderRadius;
    }
  }

  if (allowed.kanbanColumnWidth !== undefined) {
    allowed.kanbanColumnWidth = normaliseKanbanColumnWidth(
      Number(allowed.kanbanColumnWidth),
    );
  }

  _keepOneOf(allowed, "browseViewMode", VIEW_MODES);
  _keepOneOf(allowed, "notesCardPreview", TOGGLE_VALUES);
  _keepOneOf(allowed, "notesCompactMode", TOGGLE_VALUES);
};

const clearedKeys = (settings: UserSettingsPatch): (keyof User)[] =>
  EDITABLE_SETTING_KEYS.filter((key) => settings[key] === null);

const keepAllowed = (
  settings: UserSettingsPatch,
  stored: User,
): Partial<User> => {
  const allowed: Partial<User> = {};

  for (const key of EDITABLE_SETTING_KEYS) {
    const value = settings[key];
    if (value !== undefined && value !== null) {
      (allowed[key] as unknown) = value;
    }
  }

  if (allowed.notesFontSize !== undefined) {
    allowed.notesFontSize = normaliseNoteFontSize(Number(allowed.notesFontSize));
  }

  _normaliseLooks(allowed);

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
  settings: UserSettingsPatch
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
    const cleared = clearedKeys(settings);
    const rejected = Object.keys(settings).filter(
      (key) =>
        !(key in updates) &&
        !cleared.includes(key as keyof User) &&
        settings[key as keyof User] !== undefined
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

    const updatedUser = await patchUserFields(currentUser.username, updates, cleared);

    if (!updatedUser) {
      return { success: false, error: "Failed to update user settings" };
    }

    await logAudit({
      level: "INFO",
      action: "user_settings_updated",
      category: "settings",
      success: true,
      metadata: {
        changes: [...Object.keys(updates), ...cleared],
        settingsUpdated: updates,
        settingsCleared: cleared,
      },
    });

    await broadcast({
      type: "settings",
      action: "updated",
      username: currentUser.username,
      recipient: currentUser.username,
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
