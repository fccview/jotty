"use server";

import { ItemType } from "@/app/_types/core";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { FolderShares, ItemShares } from "@/app/_types/sharing";
import { getUsername } from "@/app/_server/actions/users";
import {
  canReach,
  folderShares as _folderShares,
  itemShares as _itemShares,
  usersWithAccess as _usersWithAccess,
} from "./queries";

const _canRead = async (uuid: string, itemType: ItemType): Promise<boolean> => {
  const username = await getUsername();
  if (!username) return false;

  return canReach(uuid, itemType, username, PermissionTypes.READ);
};

export const usersWithAccess = async (
  uuid: string,
  itemType: ItemType = ItemTypes.CHECKLIST,
): Promise<string[]> => {
  if (!(await _canRead(uuid, itemType))) return [];

  return _usersWithAccess(uuid, itemType);
};

export const itemShares = async (
  uuid: string,
  itemType: ItemType,
): Promise<ItemShares> => {
  if (!(await _canRead(uuid, itemType))) {
    return { users: {}, isPublic: false, inherited: false };
  }

  return _itemShares(uuid, itemType);
};

export const folderShares = async (
  mode: Modes,
  categoryPath: string,
): Promise<FolderShares> => _folderShares(mode, categoryPath);
