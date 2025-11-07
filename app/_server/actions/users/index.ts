"use server";

import {
  ARCHIVED_DIR_NAME,
  CHECKLISTS_DIR,
  NOTES_DIR,
  USERS_FILE,
} from "@/app/_consts/files";
import { readJsonFile, writeJsonFile } from "../file";
import {
  Checklist,
  ImageSyntax,
  LandingPage,
  Note,
  NotesAutoSaveInterval,
  NotesDefaultEditor,
  NotesDefaultMode,
  Result,
  TableSyntax,
  EnableRecurrence,
  ItemType,
} from "@/app/_types";
import { User } from "@/app/_types";
import {
  getSessionId,
  readSessions,
  removeAllSessionsForUser,
} from "../session";
import fs from "fs/promises";
import { createHash } from "crypto";
import path from "path";
import { updateNote } from "@/app/_server/actions/note";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { AppMode } from "@/app/_types";
import { updateList } from "@/app/_server/actions/checklist";
import { getFormData } from "@/app/_utils/global-utils";
import { capitalize } from "lodash";

export type UserUpdatePayload = {
  username?: string;
  passwordHash?: string;
  isAdmin?: boolean;
  avatarUrl?: string;
};

const _findFileRecursively = async (
  dir: string,
  targetFileName: string,
  targetCategory: string
): Promise<string | null> => {
  const categoryParts = targetCategory.split("/");
  const currentCategoryPart = categoryParts[0];
  const remainingCategoryParts = categoryParts.slice(1);

  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name === currentCategoryPart) {
        if (remainingCategoryParts.length === 0) {
          const categoryPath = path.join(dir, entry.name);
          const categoryEntries = await fs.readdir(categoryPath, {
            withFileTypes: true,
          });

          for (const fileEntry of categoryEntries) {
            if (fileEntry.isFile() && fileEntry.name === targetFileName) {
              return path.join(categoryPath, fileEntry.name);
            }
          }
        } else {
          const result = await _findFileRecursively(
            path.join(dir, entry.name),
            targetFileName,
            remainingCategoryParts.join("/")
          );
          if (result) return result;
        }
      } else {
        const result = await _findFileRecursively(
          path.join(dir, entry.name),
          targetFileName,
          targetCategory
        );
        if (result) return result;
      }
    }
  }

  return null;
};

const _getUserIndex = async (username: string): Promise<number> => {
  const allUsers = await readJsonFile(USERS_FILE);
  return allUsers.findIndex((user: User) => user.username === username);
};

const _getUserByItem = async (
  itemID: string,
  itemCategory: string,
  itemType: ItemType
): Promise<Result<User>> => {
  try {
    const baseDir = path.join(
      process.cwd(),
      "data",
      itemType === ItemTypes.CHECKLIST ? Modes.CHECKLISTS : Modes.NOTES
    );
    const targetFileName = `${itemID}.md`;
    const foundFile = await _findFileRecursively(
      baseDir,
      targetFileName,
      itemCategory
    );

    if (!foundFile) {
      return {
        success: false,
        error: `${itemType === ItemTypes.CHECKLIST
          ? capitalize(ItemTypes.CHECKLIST)
          : capitalize(ItemTypes.NOTE)
          } not found`,
      };
    }

    const pathParts = foundFile.split(path.sep);
    const typeIndex = pathParts.indexOf(
      itemType === ItemTypes.CHECKLIST ? Modes.CHECKLISTS : Modes.NOTES
    );
    const username = pathParts[typeIndex + 1];

    const foundUser = await getUserByUsername(username);

    if (!foundUser) {
      return { success: false, error: "Invalid user" };
    }

    return { success: true, data: foundUser };
  } catch (error) {
    console.error(`Error in getUserBy${itemType}:`, error);
    return { success: false, error: `Failed to find ${itemType} owner` };
  }
};

const _getUserByItemUuid = async (
  uuid: string,
  itemType: ItemType
): Promise<Result<User>> => {
  try {
    const users = await readJsonFile(USERS_FILE);

    for (const user of users) {
      try {
        const { getUserNotes } = await import("@/app/_server/actions/note");
        const { getUserChecklists } = await import("@/app/_server/actions/checklist");

        const result =
          itemType === ItemTypes.NOTE
            ? await getUserNotes({ username: user.username, isRaw: true, allowArchived: true })
            : await getUserChecklists({ username: user.username, isRaw: true, allowArchived: true });

        if (result.success && result.data) {
          const item = result.data.find((item) => item.uuid === uuid);
          if (item) {
            return { success: true, data: user };
          }
        } else {
          console.log("Failed to get items for user", user.username, "result:", result);
        }
      } catch (error) {
        console.log("Error checking user", user.username, ":", error);
        // Continue to next user
        continue;
      }
    }

    return {
      success: false,
      error: `${itemType === ItemTypes.NOTE
        ? capitalize(ItemTypes.NOTE)
        : capitalize(ItemTypes.CHECKLIST)
        } not found`,
    };
  } catch (error) {
    console.error(`Error in getUserBy${itemType}Uuid:`, error);
    return { success: false, error: `Failed to find ${itemType} owner` };
  }
};

async function _deleteUserCore(username: string): Promise<Result<null>> {
  const allUsers = await readJsonFile(USERS_FILE);
  const userIndex = await _getUserIndex(username);

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
  const userIndex = await _getUserIndex(targetUsername);

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

export const getCurrentUser = async (
  username?: string
): Promise<User | null> => {
  const users = await readJsonFile(USERS_FILE);

  const sessionId = await getSessionId();
  const sessions = await readSessions();
  const currentUsername = sessions[sessionId || ""];

  if (!currentUsername && !username) return null;

  return (await getUserByUsername(currentUsername || username || "")) || null;
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

    const { targetUsername, newUsername, password, admin } = getFormData(
      formData,
      ["username", "newUsername", "password", "isAdmin"]
    );
    const isAdmin = admin === "true";
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
  const users = (await readJsonFile(USERS_FILE)) || [];

  if (!users || !Array.isArray(users)) {
    return [];
  }

  return users.map(({ username, isAdmin, isSuperAdmin, avatarUrl }: User) => ({
    username,
    isAdmin,
    isSuperAdmin,
    avatarUrl,
  }));
};

export const updateUserSettings = async ({
  preferredTheme,
  imageSyntax,
  tableSyntax,
  landingPage,
  notesDefaultEditor,
  notesDefaultMode,
  enableRecurrence,
  notesAutoSaveInterval,
}: {
  preferredTheme?: string;
  imageSyntax?: ImageSyntax;
  tableSyntax?: TableSyntax;
  landingPage?: LandingPage;
  notesDefaultEditor?: NotesDefaultEditor;
  notesDefaultMode?: NotesDefaultMode;
  enableRecurrence?: EnableRecurrence;
  notesAutoSaveInterval?: NotesAutoSaveInterval;
}): Promise<Result<{ user: User }>> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    const allUsers = await readJsonFile(USERS_FILE);
    const userIndex = await _getUserIndex(currentUser.username);

    const updates: Partial<User> = {};

    if (preferredTheme !== undefined) updates.preferredTheme = preferredTheme;
    if (imageSyntax !== undefined) updates.imageSyntax = imageSyntax;
    if (tableSyntax !== undefined) updates.tableSyntax = tableSyntax;
    if (landingPage !== undefined) updates.landingPage = landingPage;
    if (notesAutoSaveInterval !== undefined)
      updates.notesAutoSaveInterval = notesAutoSaveInterval;
    if (notesDefaultEditor !== undefined)
      updates.notesDefaultEditor = notesDefaultEditor;
    if (notesDefaultMode !== undefined)
      updates.notesDefaultMode = notesDefaultMode;
    if (enableRecurrence !== undefined)
      updates.enableRecurrence = enableRecurrence;

    const updatedUser: User = {
      ...allUsers[userIndex],
      ...updates,
    };

    allUsers[userIndex] = updatedUser;
    await writeJsonFile(allUsers, USERS_FILE);

    return { success: true, data: { user: updatedUser } };
  } catch (error) {
    console.error("Error updating user settings:", error);
    return { success: false, error: "Failed to update user settings" };
  }
};

export const getUserByNoteUuid = async (
  uuid: string
): Promise<Result<User>> => {
  return _getUserByItemUuid(uuid, ItemTypes.NOTE);
};

export const getUserByChecklistUuid = async (
  uuid: string
): Promise<Result<User>> => {
  return _getUserByItemUuid(uuid, ItemTypes.CHECKLIST);
};

export const getUserByChecklist = async (
  checklistID: string,
  checklistCategory: string
): Promise<Result<User>> => {
  return _getUserByItem(checklistID, checklistCategory, ItemTypes.CHECKLIST);
};

export const getUserByNote = async (
  noteID: string,
  noteCategory: string
): Promise<Result<User>> => {
  return _getUserByItem(noteID, noteCategory, ItemTypes.NOTE);
};
