"use server";

import { CHECKLISTS_DIR, NOTES_DIR, USERS_FILE } from "@/app/_consts/files";
import { readJsonFile, writeJsonFile } from "../file";
import { Result } from "@/app/_types";
import { User } from "@/app/_types";
import {
  getSessionId,
  readSessions,
  removeAllSessionsForUser,
} from "../session";
import fs from "fs/promises";
import { cookies } from "next/headers";
import { createHash } from "crypto";

export type UserUpdatePayload = {
  username?: string;
  passwordHash?: string;
  isAdmin?: boolean;
  avatarUrl?: string;
};

async function _deleteUserCore(username: string): Promise<Result<null>> {
  const allUsers = await readJsonFile(USERS_FILE);
  const userIndex = allUsers.findIndex(
    (user: User) => user.username === username
  );

  if (userIndex === -1) {
    return { success: false, error: "User not found" };
  }

  const userToDelete = allUsers[userIndex];
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

export const getUserByUsername = async (
  username: string
): Promise<User | null> => {
  const allUsers = await readJsonFile(USERS_FILE);
  return allUsers.find((user: User) => user.username === username) || null;
};

async function _updateUserCore(
  targetUsername: string,
  updates: UserUpdatePayload
): Promise<Result<Omit<User, "passwordHash">>> {
  if (Object.keys(updates).length === 0) {
    return { success: false, error: "No updates provided." };
  }

  const allUsers = await readJsonFile(USERS_FILE);
  const userIndex = allUsers.findIndex(
    (user: User) => user.username === targetUsername
  );

  if (userIndex === -1) {
    return { success: false, error: "User not found" };
  }

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
  try {
    const username = formData.get("username") as string;
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
    const userExists = existingUsers.find(
      (user: User) => user.username === username
    );

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
    };

    const updatedUsers = [...existingUsers, newUser];

    await writeJsonFile(updatedUsers, USERS_FILE);

    const { passwordHash: _, ...userWithoutPassword } = newUser;

    return {
      success: true,
      data: userWithoutPassword,
    };
  } catch (error) {
    console.error("Error creating user:", error);
    return {
      success: false,
      error: "Failed to create user",
    };
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  const users = await readJsonFile(USERS_FILE);

  const sessionId = await getSessionId();
  const sessions = await readSessions();
  const username = sessions[sessionId || ""];

  if (!username) return null;

  return users.find((u: User) => u.username === username) || null;
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

    return await _deleteUserCore(usernameToDelete);
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

    const users = await readJsonFile(USERS_FILE);
    const userRecord = users.find(
      (user: User) => user.username === currentUser.username
    );
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

export const hasUsers = async (): Promise<boolean> => {
  try {
    const users = await readJsonFile(USERS_FILE);
    return users.length > 0;
  } catch (error) {
    return false;
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

    const newUsername = formData.get("newUsername") as string;
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const avatarUrl = formData.get("avatarUrl") as string | undefined;
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

      const users = await readJsonFile(USERS_FILE);
      const userRecord = users.find(
        (u: User) => u.username === currentUser.username
      );
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
      return { success: false, error: result.error };
    }

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

    const targetUsername = formData.get("username") as string;
    const newUsername = formData.get("newUsername") as string;
    const password = formData.get("password") as string;
    const isAdmin = formData.get("isAdmin") === "true";
    const updates: UserUpdatePayload = {};

    if (!targetUsername || !newUsername || newUsername.length < 3) {
      return {
        success: false,
        error: "Valid current and new username are required",
      };
    }

    if (newUsername !== targetUsername) {
      updates.username = newUsername;
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

    return await _updateUserCore(targetUsername, updates);
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, error: "Failed to update user" };
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return user !== null;
};

export const isAdmin = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return user?.isAdmin || false;
};

export const getUsername = async (): Promise<string> => {
  const user = await getCurrentUser();
  return user?.username || "";
};

export const getUsers = async () => {
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return { error: "Unauthorized" };
  }

  const users = await readJsonFile(USERS_FILE);
  return users.map(({ username, isAdmin, isSuperAdmin }: User) => ({
    username,
    isAdmin,
    isSuperAdmin,
  }));
};

export const toggleAdmin = async (formData: FormData) => {
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return { error: "Unauthorized" };
  }

  const username = formData.get("username") as string;
  if (!username) {
    return { error: "Username is required" };
  }

  const users = await readJsonFile(USERS_FILE);
  const userToUpdate = users.find((u: User) => u.username === username);

  if (!userToUpdate) {
    return { error: "User not found" };
  }

  userToUpdate.isAdmin = !userToUpdate.isAdmin;
  await writeJsonFile(users, USERS_FILE);

  return { success: true };
};
