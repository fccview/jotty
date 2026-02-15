"use server";

import {
  CHECKLISTS_DIR,
  NOTES_DIR,
  USERS_FILE,
} from "@/app/_consts/files";
import { readJsonFile, writeJsonFile } from "../file";
import { Result, User } from "@/app/_types";
import { removeAllSessionsForUser } from "../session";
import fs from "fs/promises";
import { createHash } from "crypto";
import { ItemTypes } from "@/app/_types/enums";
import { getFormData } from "@/app/_utils/global-utils";
import { logUserEvent } from "@/app/_server/actions/log";
import { getUserIndex } from "./helpers";
import { getUserByUsername, getCurrentUser } from "./queries";

export type UserUpdatePayload = {
  username?: string;
  passwordHash?: string;
  isAdmin?: boolean;
  avatarUrl?: string;
};

export async function _deleteUserCore(username: string): Promise<Result<null>> {
  const allUsers = await readJsonFile(USERS_FILE);
  const userIndex = await getUserIndex(username);

  if (userIndex === -1) {
    return { success: false, error: "User not found" };
  }

  const userToDelete = allUsers[userIndex];

  if (userToDelete.isSuperAdmin) {
    return { success: false, error: "Cannot delete the super admin (system owner)" };
  }

  if (userToDelete.isAdmin) {
    const adminCount = allUsers.filter((user: User) => user.isAdmin).length;
    if (adminCount === 1) {
      return { success: false, error: "Cannot delete the last admin user" };
    }
  }

  await removeAllSessionsForUser(username);

  try {
    await fs.rm(CHECKLISTS_DIR(username), { recursive: true, force: true });

    const docsDir = NOTES_DIR(username);
    await fs.rm(docsDir, { recursive: true, force: true });
  } catch (error) {
    console.warn(
      `Warning: Could not clean up data files for ${username}:`,
      error
    );
  }

  allUsers.splice(userIndex, 1);
  await writeJsonFile(allUsers, USERS_FILE);

  return { success: true, data: null };
}

export async function _updateUserCore(
  targetUsername: string,
  updates: UserUpdatePayload
): Promise<Result<Omit<User, "passwordHash">>> {
  if (Object.keys(updates).length === 0) {
    return { success: false, error: "No updates provided." };
  }

  const allUsers = await readJsonFile(USERS_FILE);
  const userIndex = await getUserIndex(targetUsername);

  if (updates.username && updates.username !== targetUsername) {
    const usernameExists = allUsers.some(
      (user: User) => user.username === updates.username
    );
    if (usernameExists) {
      return { success: false, error: "Username already exists" };
    }

    try {
      const oldChecklistsPath = CHECKLISTS_DIR(targetUsername);
      const newChecklistsPath = CHECKLISTS_DIR(updates.username);
      await fs.rename(oldChecklistsPath, newChecklistsPath);
    } catch (error) {
      console.warn(
        `Could not rename checklists directory for ${targetUsername}:`,
        error
      );
    }

    try {
      const oldNotesPath = NOTES_DIR(targetUsername);
      const newNotesPath = NOTES_DIR(updates.username);
      await fs.rename(oldNotesPath, newNotesPath);
    } catch (error) {
      console.warn(
        `Could not rename notes directory for ${targetUsername}:`,
        error
      );
    }

    try {
      const { updateSharingData, updateReceiverUsername } = await import(
        "@/app/_server/actions/sharing"
      );

      await updateSharingData(
        { sharer: targetUsername } as any,
        { sharer: updates.username } as any
      );

      await updateReceiverUsername(
        targetUsername,
        updates.username,
        ItemTypes.CHECKLIST
      );
      await updateReceiverUsername(
        targetUsername,
        updates.username,
        ItemTypes.NOTE
      );
    } catch (error) {
      console.warn(
        `Could not update sharing data for username change ${targetUsername} -> ${updates.username}:`,
        error
      );
    }
  }

  const updatedUser: User = {
    ...allUsers[userIndex],
    ...updates,
  };

  allUsers[userIndex] = updatedUser;
  await writeJsonFile(allUsers, USERS_FILE);

  const { passwordHash: _, ...userWithoutPassword } = updatedUser;
  return { success: true, data: userWithoutPassword };
}

export const createUser = async (
  formData: FormData
): Promise<Result<Omit<User, "passwordHash">>> => {
  const username = formData.get("username") as string;

  try {
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const isAdmin = formData.get("isAdmin") === "true";

    if (!username || !password || !confirmPassword) {
      return {
        success: false,
        error: "Username, password, and confirm password are required",
      };
    }

    if (username.length < 3) {
      return {
        success: false,
        error: "Username must be at least 3 characters long",
      };
    }

    if (password.length < 6) {
      return {
        success: false,
        error: "Password must be at least 6 characters long",
      };
    }

    if (password !== confirmPassword) {
      return {
        success: false,
        error: "Passwords do not match",
      };
    }

    const existingUsers = await readJsonFile(USERS_FILE);
    const userExists = await getUserByUsername(username);

    if (userExists) {
      return {
        success: false,
        error: "Username already exists",
      };
    }

    const hashedPassword = createHash("sha256").update(password).digest("hex");

    const newUser: User = {
      username,
      passwordHash: hashedPassword,
      isAdmin,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      preferredDateFormat: "dd/mm/yyyy",
      preferredTimeFormat: "12-hours",
      handedness: "right-handed",
    };

    const updatedUsers = [...existingUsers, newUser];

    await writeJsonFile(updatedUsers, USERS_FILE);

    const { passwordHash: _, ...userWithoutPassword } = newUser;

    await logUserEvent("user_created", username, true, { isAdmin });

    return {
      success: true,
      data: userWithoutPassword,
    };
  } catch (error) {
    console.error("Error creating user:", error);
    await logUserEvent("user_created", username || "unknown", false);
    return {
      success: false,
      error: "Failed to create user",
    };
  }
};

export const deleteUser = async (formData: FormData): Promise<Result<null>> => {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser?.isAdmin) {
      return { success: false, error: "Unauthorized: Admin access required" };
    }

    const usernameToDelete = formData.get("username") as string;
    if (!usernameToDelete) {
      return { success: false, error: "Username is required" };
    }

    const result = await _deleteUserCore(usernameToDelete);

    if (result.success) {
      await logUserEvent("user_deleted", usernameToDelete, true);
    } else {
      await logUserEvent("user_deleted", usernameToDelete, false, { error: result.error });
    }

    return result;
  } catch (error) {
    console.error("Error in deleteUser:", error);
    return { success: false, error: "Failed to delete user" };
  }
};

export const deleteAccount = async (
  formData: FormData
): Promise<Result<null>> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    const confirmPassword = formData.get("confirmPassword") as string;
    if (!confirmPassword) {
      return { success: false, error: "Password confirmation is required" };
    }

    const userRecord = await getUserByUsername(currentUser.username);

    if (!userRecord) {
      return { success: false, error: "User not found" };
    }

    const passwordHash = createHash("sha256")
      .update(confirmPassword)
      .digest("hex");
    if (userRecord.passwordHash !== passwordHash) {
      return { success: false, error: "Incorrect password" };
    }

    return await _deleteUserCore(currentUser.username);
  } catch (error) {
    console.error("Error in deleteAccount:", error);
    return { success: false, error: "Failed to delete account" };
  }
};

export const updateProfile = async (
  formData: FormData
): Promise<Result<null>> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    const { newUsername, currentPassword, newPassword, avatarUrl } =
      getFormData(formData, [
        "newUsername",
        "currentPassword",
        "newPassword",
        "avatarUrl",
      ]);
    const updates: UserUpdatePayload = {};

    if (!newUsername || newUsername.length < 3) {
      return {
        success: false,
        error: "Username must be at least 3 characters long",
      };
    }
    if (newUsername !== currentUser.username) {
      updates.username = newUsername;
    }

    if (avatarUrl !== undefined) {
      updates.avatarUrl = avatarUrl === "" ? undefined : avatarUrl;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return {
          success: false,
          error: "New password must be at least 6 characters long",
        };
      }
      if (!currentPassword) {
        return {
          success: false,
          error: "Current password is required to change password",
        };
      }

      const userRecord = await getUserByUsername(currentUser.username);
      const currentPasswordHash = createHash("sha256")
        .update(currentPassword)
        .digest("hex");

      if (userRecord?.passwordHash !== currentPasswordHash) {
        return { success: false, error: "Current password is incorrect" };
      }

      updates.passwordHash = createHash("sha256")
        .update(newPassword)
        .digest("hex");
    }

    if (Object.keys(updates).length === 0) {
      return { success: true, data: null };
    }

    const result = await _updateUserCore(currentUser.username, updates);
    if (!result.success) {
      await logUserEvent("profile_updated", currentUser.username, false, { error: result.error });
      return { success: false, error: result.error };
    }

    await logUserEvent("profile_updated", currentUser.username, true, { changes: Object.keys(updates) });

    return { success: true, data: null };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
};

export const updateUser = async (
  formData: FormData
): Promise<Result<Omit<User, "passwordHash">>> => {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser?.isAdmin) {
      return { success: false, error: "Unauthorized: Admin access required" };
    }

    const { username: targetUsername, newUsername, password, isAdmin: adminStr } = getFormData(
      formData,
      ["username", "newUsername", "password", "isAdmin"]
    );
    const isAdmin = adminStr === "true";
    const updates: UserUpdatePayload = {};

    if (!targetUsername || !newUsername || newUsername.length < 3) {
      return {
        success: false,
        error: "Valid current and new username are required",
      };
    }

    const allUsers = await readJsonFile(USERS_FILE);
    const targetUser = allUsers.find((u: User) => u.username === targetUsername);

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    if (targetUser.isSuperAdmin && !adminUser?.isSuperAdmin) {
      await logUserEvent("user_updated", targetUsername, false, {
        error: "Unauthorized: Cannot modify super admin",
        attemptedBy: adminUser?.username
      });
      return {
        success: false,
        error: "Unauthorized: Cannot modify the system owner account"
      };
    }

    if (targetUser.isSuperAdmin && adminUser?.username !== targetUsername) {
      await logUserEvent("user_updated", targetUsername, false, {
        error: "Unauthorized: Only super admin can modify their own account",
        attemptedBy: adminUser?.username
      });
      return {
        success: false,
        error: "Only the system owner can modify their own account"
      };
    }

    if (newUsername !== targetUsername) {
      updates.username = newUsername;
    }

    if (targetUser.isSuperAdmin && !isAdmin) {
      return {
        success: false,
        error: "Cannot remove admin privileges from the system owner"
      };
    }

    updates.isAdmin = isAdmin;

    if (password) {
      if (password.length < 6) {
        return {
          success: false,
          error: "Password must be at least 6 characters long",
        };
      }
      updates.passwordHash = createHash("sha256")
        .update(password)
        .digest("hex");
    }

    const result = await _updateUserCore(targetUsername, updates);

    if (result.success) {
      await logUserEvent("user_updated", targetUsername, true, { changes: Object.keys(updates) });
    } else {
      await logUserEvent("user_updated", targetUsername, false, { error: result.error });
    }

    return result;
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, error: "Failed to update user" };
  }
};
