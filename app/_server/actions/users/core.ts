import {
  CHECKLISTS_DIR,
  NOTES_DIR,
} from "@/app/_consts/files";
import { serverDeleteDir, serverRenamePath } from "../file";
import { Result, SanitisedUser, User } from "@/app/_types";
import { sanitizeUserForClient } from "@/app/_utils/user-sanitize-utils";
import { removeAllSessionsForUser } from "../session/store";
import { mutateUsers } from "./records";
import { grepItemUuids } from "@/app/_utils/grep-utils";
import { sweepOrphans } from "@/app/_server/actions/attachments/lifecycle";
import { removeAvatar } from "@/app/_server/actions/attachments/avatars";

export type UserUpdatePayload = {
  username?: string;
  passwordHash?: string;
  isAdmin?: boolean;
  avatarUrl?: string;
};

const USER_MISSING = "User not found";

const _deletionRefusal = (users: User[], target: User): string | null => {
  if (target.isSuperAdmin) {
    return "Cannot delete the super admin (system owner)";
  }

  const adminCount = users.filter((user) => user.isAdmin).length;
  if (target.isAdmin && adminCount === 1) {
    return "Cannot delete the last admin user";
  }

  return null;
};

const _moveUserDirs = async (from: string, to: string): Promise<void> => {
  try {
    await serverRenamePath(CHECKLISTS_DIR(from), CHECKLISTS_DIR(to));
  } catch (error) {
    console.warn(`Could not rename checklists directory for ${from}:`, error);
  }

  try {
    await serverRenamePath(NOTES_DIR(from), NOTES_DIR(to));
  } catch (error) {
    console.warn(`Could not rename notes directory for ${from}:`, error);
  }

  try {
    const { renameGrants } = await import("@/app/_server/actions/share/rename");

    await renameGrants(from, to);
  } catch (error) {
    console.warn(
      `Could not update sharing data for username change ${from} -> ${to}:`,
      error
    );
  }
};

export async function _deleteUserCore(username: string): Promise<Result<null>> {
  let refusal = USER_MISSING;

  const removed = await mutateUsers((users) => {
    const index = users.findIndex((user: User) => user.username === username);
    if (index === -1) return null;

    const blocked = _deletionRefusal(users, users[index]);
    if (blocked) {
      refusal = blocked;
      return null;
    }

    const [gone] = users.splice(index, 1);
    return gone;
  });

  if (!removed) return { success: false, error: refusal };

  await removeAllSessionsForUser(username);

  const doomed = [
    ...(await grepItemUuids(CHECKLISTS_DIR(username))),
    ...(await grepItemUuids(NOTES_DIR(username))),
  ];

  try {
    await serverDeleteDir(CHECKLISTS_DIR(username));
    await serverDeleteDir(NOTES_DIR(username));
  } catch (error) {
    console.warn(
      `Warning: Could not clean up data files for ${username}:`,
      error
    );
  }

  await sweepOrphans(doomed);
  if (removed.uuid) await removeAvatar(removed.uuid);

  try {
    const { revokeGrants } = await import("@/app/_server/actions/share/rename");

    await revokeGrants(username);
  } catch (error) {
    console.error(`Could not revoke shares granted to ${username}:`, error);
  }

  return { success: true, data: null };
}

export async function _updateUserCore(
  targetUsername: string,
  updates: UserUpdatePayload
): Promise<Result<SanitisedUser>> {
  if (Object.keys(updates).length === 0) {
    return { success: false, error: "No updates provided." };
  }

  let refusal = USER_MISSING;

  const updatedUser = await mutateUsers(async (users) => {
    const userIndex = users.findIndex(
      (user: User) => user.username === targetUsername
    );
    if (userIndex === -1) return null;

    const renaming = updates.username && updates.username !== targetUsername;

    if (renaming && users.some((user) => user.username === updates.username)) {
      refusal = "Username already exists";
      return null;
    }

    if (renaming) await _moveUserDirs(targetUsername, updates.username!);

    const next: User = { ...users[userIndex], ...updates };
    users[userIndex] = next;

    return next;
  });

  if (!updatedUser) return { success: false, error: refusal };

  return { success: true, data: sanitizeUserForClient(updatedUser)! };
}
