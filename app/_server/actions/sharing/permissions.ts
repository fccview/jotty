"use server";

import { ItemType, SharingPermissions } from "@/app/_types/core";
import { PermissionTypes } from "@/app/_types/enums";
import { isAdmin } from "@/app/_server/actions/users";
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
  const entry = userShares.find((entry) => entry.uuid === uuid);
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
  ownerUsername?: string,
): Promise<boolean> => {
  try {
    const username =
      typeof currentUsername === "string"
        ? currentUsername
        : (currentUsername as { username?: string })?.username;
    if (!username) return false;

    const isAdminUser = await isAdmin();
    if (isAdminUser) return true;

    if (ownerUsername && ownerUsername === username) return true;

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
