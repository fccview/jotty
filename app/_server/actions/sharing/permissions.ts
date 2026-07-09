"use server";

import path from "path";
import { ItemType, SharingPermissions } from "@/app/_types/core";
import { ItemTypes, PermissionTypes } from "@/app/_types/enums";
import { isAdmin } from "@/app/_server/actions/users";
import { CHECKLISTS_DIR, NOTES_DIR } from "@/app/_consts/files";
import { readShareFile } from "./io";

export const isItemSharedWith = async (
  uuid: string,
  itemType: ItemType,
  username: string,
): Promise<boolean> => {
  const sharingData = await readShareFile(itemType);
  const userShares = sharingData[username] || [];

  return userShares.some((entry) => entry.uuid === uuid);
};

export const getItemPermissions = async (
  uuid: string,
  itemType: ItemType,
  username: string,
): Promise<SharingPermissions | null> => {
  const sharingData = await readShareFile(itemType);
  const userShares = sharingData[username] || [];
  const entry = userShares.find((share) => share.uuid === uuid);

  return entry ? entry.permissions : null;
};

export const canUserReadItem = async (
  uuid: string,
  itemType: ItemType,
  username: string,
): Promise<boolean> => {
  const permissions = await getItemPermissions(uuid, itemType, username);
  return permissions?.canRead === true;
};

export const canUserWriteItem = async (
  uuid: string,
  itemType: ItemType,
  username: string,
): Promise<boolean> => {
  const permissions = await getItemPermissions(uuid, itemType, username);
  return permissions?.canEdit === true;
};

export const canUserDeleteItem = async (
  uuid: string,
  itemType: ItemType,
  username: string,
): Promise<boolean> => {
  const permissions = await getItemPermissions(uuid, itemType, username);
  return permissions?.canDelete === true;
};

export const checkUserPermission = async (
  uuid: string,
  itemType: ItemType,
  currentUsername: string,
  permission: PermissionTypes,
): Promise<boolean> => {
  try {
    const username =
      typeof currentUsername === "string"
        ? currentUsername
        : (currentUsername as { username?: string })?.username;
    if (!username) return false;

    const isAdminUser = await isAdmin();
    if (isAdminUser) return true;

    const { grepCheckUuidExists } = await import("@/app/_utils/grep-utils");
    const userDir = path.join(
      process.cwd(),
      itemType === ItemTypes.CHECKLIST
        ? CHECKLISTS_DIR(username)
        : NOTES_DIR(username),
    );

    if (await grepCheckUuidExists(userDir, uuid)) {
      return true;
    }

    const { getUserByChecklistUuid, getUserByNoteUuid } =
      await import("@/app/_server/actions/users");
    const ownerResult =
      itemType === ItemTypes.CHECKLIST
        ? await getUserByChecklistUuid(uuid)
        : await getUserByNoteUuid(uuid);
    const owner = ownerResult.success ? ownerResult.data : null;

    if (!owner) return false;
    if (owner.username === username) return true;

    switch (permission) {
      case PermissionTypes.READ:
        return await canUserReadItem(uuid, itemType, username);
      case PermissionTypes.EDIT:
        return await canUserWriteItem(uuid, itemType, username);
      case PermissionTypes.DELETE:
        return await canUserDeleteItem(uuid, itemType, username);
      default:
        return false;
    }
  } catch (error) {
    console.error("Error in checkUserPermission:", error);
    return false;
  }
};
