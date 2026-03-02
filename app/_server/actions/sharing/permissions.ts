"use server";

import path from "path";
import fs from "fs/promises";
import { ItemType, SharingPermissions } from "@/app/_types/core";
import { encodeCategoryPath } from "@/app/_utils/global-utils";
import { ItemTypes, PermissionTypes } from "@/app/_types/enums";
import {
  isAdmin,
  getUserByChecklist,
  getUserByNote,
} from "@/app/_server/actions/users";
import { CHECKLISTS_DIR, NOTES_DIR } from "@/app/_consts/files";
import { readShareFile } from "./io";

export const isItemSharedWith = async (
  item: string,
  categoryPath: string,
  itemType: ItemType,
  username: string,
): Promise<boolean> => {
  const sharingData = await readShareFile(itemType);

  const userShares = sharingData[username] || [];

  let found = userShares.some((entry) => entry.uuid === item);

  if (!found && categoryPath) {
    const encodedCategory = encodeCategoryPath(categoryPath || "Uncategorized");
    found = userShares.some(
      (entry) => entry.id === item && entry.category === encodedCategory,
    );
  }

  return found;
};

export const getItemPermissions = async (
  item: string,
  categoryPath: string,
  itemType: ItemType,
  username: string,
): Promise<SharingPermissions | null> => {
  const sharingData = await readShareFile(itemType);

  const userShares = sharingData[username] || [];

  let entry = userShares.find((entry) => entry.uuid === item);

  if (!entry && categoryPath) {
    const encodedCategory = encodeCategoryPath(categoryPath || "Uncategorized");
    entry = userShares.find(
      (entry) => entry.id === item && entry.category === encodedCategory,
    );
  }

  return entry ? entry.permissions : null;
};

export const canUserReadItem = async (
  item: string,
  categoryPath: string,
  itemType: ItemType,
  username: string,
): Promise<boolean> => {
  const permissions = await getItemPermissions(
    item,
    categoryPath,
    itemType,
    username,
  );
  return permissions?.canRead === true;
};

export const canUserWriteItem = async (
  item: string,
  categoryPath: string,
  itemType: ItemType,
  username: string,
): Promise<boolean> => {
  const permissions = await getItemPermissions(
    item,
    categoryPath,
    itemType,
    username,
  );
  return permissions?.canEdit === true;
};

export const canUserDeleteItem = async (
  item: string,
  categoryPath: string,
  itemType: ItemType,
  username: string,
): Promise<boolean> => {
  const permissions = await getItemPermissions(
    item,
    categoryPath,
    itemType,
    username,
  );
  return permissions?.canDelete === true;
};

export const checkUserPermission = async (
  itemId: string,
  itemCategory: string,
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

    const userDir =
      itemType === ItemTypes.CHECKLIST
        ? CHECKLISTS_DIR(username)
        : NOTES_DIR(username);
    const categoryDir = path.join(userDir, itemCategory);
    const filePath = path.join(categoryDir, `${itemId}.md`);

    try {
      await fs.access(filePath);
      return true;
    } catch {}

    let owner = null;
    if (itemType === ItemTypes.CHECKLIST) {
      const { getUserByChecklistUuid } =
        await import("@/app/_server/actions/users");
      const ownerResult = await getUserByChecklistUuid(itemId);
      if (ownerResult.success) {
        owner = ownerResult.data;
      }
    } else {
      const { getUserByNoteUuid } = await import("@/app/_server/actions/users");
      const ownerResult = await getUserByNoteUuid(itemId);
      if (ownerResult.success) {
        owner = ownerResult.data;
      }
    }

    if (!owner) {
      const ownerResult =
        itemType === ItemTypes.CHECKLIST
          ? await getUserByChecklist(itemId, itemCategory)
          : await getUserByNote(itemId, itemCategory);

      if (!ownerResult.success) return false;
      owner = ownerResult.data;
    }

    if (owner?.username === username) return true;

    switch (permission) {
      case PermissionTypes.READ:
        return await canUserReadItem(itemId, itemCategory, itemType, username);
      case PermissionTypes.EDIT:
        return await canUserWriteItem(itemId, itemCategory, itemType, username);
      case PermissionTypes.DELETE:
        return await canUserDeleteItem(
          itemId,
          itemCategory,
          itemType,
          username,
        );
      default:
        return false;
    }
  } catch (error) {
    console.error("Error in checkUserPermission:", error);
    return false;
  }
};
