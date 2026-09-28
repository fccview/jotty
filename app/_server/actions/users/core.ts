import {
  CHECKLISTS_DIR,
  NOTES_DIR,
  USERS_FILE,
} from "@/app/_consts/files";
import {
  readJsonFile,
  serverDeleteDir,
  serverRenamePath,
  writeJsonFile,
} from "../file";
import { Result, SanitisedUser, User } from "@/app/_types";
import { sanitizeUserForClient } from "@/app/_utils/user-sanitize-utils";
import { removeAllSessionsForUser } from "../session/store";
import { getUserIndex } from "./helpers";
import { mutateUsers } from "./records";

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
    await serverDeleteDir(CHECKLISTS_DIR(username));
    await serverDeleteDir(NOTES_DIR(username));
  } catch (error) {
    console.warn(
      `Warning: Could not clean up data files for ${username}:`,
      error
    );
  }

  try {
    const { revokeGrants } = await import("@/app/_server/actions/share/rename");

    await revokeGrants(username);
  } catch (error) {
    console.error(`Could not revoke shares granted to ${username}:`, error);
  }

  const removed = await mutateUsers((users) => {
    const index = users.findIndex((user: User) => user.username === username);
    if (index === -1) return null;

    users.splice(index, 1);
    return true;
  });

  if (!removed) return { success: false, error: "Failed to delete user" };

  return { success: true, data: null };
}

export async function _updateUserCore(
  targetUsername: string,
  updates: UserUpdatePayload
): Promise<Result<SanitisedUser>> {
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
      await serverRenamePath(oldChecklistsPath, newChecklistsPath);
    } catch (error) {
      console.warn(
        `Could not rename checklists directory for ${targetUsername}:`,
        error
      );
    }

    try {
      const oldNotesPath = NOTES_DIR(targetUsername);
      const newNotesPath = NOTES_DIR(updates.username);
      await serverRenamePath(oldNotesPath, newNotesPath);
    } catch (error) {
      console.warn(
        `Could not rename notes directory for ${targetUsername}:`,
        error
      );
    }

    try {
      const { renameGrants } = await import(
        "@/app/_server/actions/share/rename"
      );

      await renameGrants(targetUsername, updates.username);
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

  return { success: true, data: sanitizeUserForClient(updatedUser)! };
}
