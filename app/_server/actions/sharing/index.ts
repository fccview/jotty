"use server";

import { ItemType, Result, SharingPermissions } from "@/app/_types";
import { extractUuid } from "@/app/_utils/yaml-metadata-utils";
import {
  ensureDir,
  readJsonFile,
  writeJsonFile,
} from "@/app/_server/actions/file";
import { encodeCategoryPath } from "@/app/_utils/global-utils";
import path from "path";
import { DATA_DIR } from "@/app/_consts/files";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import {
  isAdmin,
  getUserByChecklist,
  getUserByNote,
} from "@/app/_server/actions/users";
import { CHECKLISTS_DIR, NOTES_DIR } from "@/app/_consts/files";
import fs from "fs/promises";
import { logAudit } from "@/app/_server/actions/log";

const getItemUuid = async (
  user: string,
  itemType: "note" | "checklist",
  itemId: string,
  category: string
): Promise<string | undefined> => {
  try {
    const dataDir = path.join(process.cwd(), "data");
    const modeDir = itemType === "checklist" ? "checklists" : "notes";
    const userDir = path.join(dataDir, modeDir, user);
    const categoryDir = path.join(userDir, category || "Uncategorized");
    const filePath = path.join(categoryDir, `${itemId}.md`);

    const content = await fs.readFile(filePath, "utf-8");
    return extractUuid(content);
  } catch (error) {
    console.warn(`Could not get UUID for item ${itemId}:`, error);
    return undefined;
  }
};

interface SharedItemEntry {
  uuid?: string;
  id?: string;
  category?: string;
  sharer: string;
  permissions: SharingPermissions;
}

interface SharingItemUpdate {
  uuid?: string;
  id?: string;
  category?: string;
  itemType: ItemType;
  sharer?: string;
}

type SharingData = Record<string, SharedItemEntry[]>;

const getSharingFilePath = (itemType: ItemType): string => {
  const folderName =
    itemType === ItemTypes.CHECKLIST ? Modes.CHECKLISTS : Modes.NOTES;
  return path.join(DATA_DIR, folderName, ".sharing.json");
};

export const readShareFile = async (
  itemType: ItemType | "all"
): Promise<SharingData> => {
  if (itemType === "all") {
    const noteSharingData = await readShareFile(ItemTypes.NOTE);
    const checklistSharingData = await readShareFile(ItemTypes.CHECKLIST);
    return {
      notes: noteSharingData,
      checklists: checklistSharingData,
    } as any;
  } else {
    const filePath = getSharingFilePath(itemType);
    await ensureDir(path.dirname(filePath));

    const content = await readJsonFile(filePath);
    return content || {};
  }
};

const writeShareFile = async (
  itemType: ItemType,
  data: SharingData
): Promise<void> => {
  const filePath = getSharingFilePath(itemType);
  await writeJsonFile(data, filePath);
};

export const shareWith = async (
  item: string,
  categoryPath: string,
  sharerUsername: string,
  receiverUsername: string,
  itemType: ItemType,
  permissions: SharingPermissions = {
    canRead: true,
    canEdit: false,
    canDelete: false,
  }
): Promise<Result<null>> => {
  try {
    const sharingData = await readShareFile(itemType);

    const itemUuid = await getItemUuid(
      sharerUsername,
      itemType === ItemTypes.CHECKLIST ? "checklist" : "note",
      item,
      categoryPath || "Uncategorized"
    );

    if (!itemUuid) {
      return {
        success: false,
        error:
          "This item needs to be saved first before it can be shared. Please edit and save the item to generate the required metadata.",
      };
    }

    const newEntry: SharedItemEntry = {
      uuid: itemUuid,
      id: item,
      sharer: sharerUsername,
      permissions,
    };

    if (!sharingData[receiverUsername]) {
      sharingData[receiverUsername] = [];
    }

    sharingData[receiverUsername] = sharingData[receiverUsername].filter(
      (entry) => !(entry.id === item && entry.sharer === sharerUsername)
    );

    sharingData[receiverUsername].push(newEntry);

    await writeShareFile(itemType, sharingData);

    await logAudit({
      level: "INFO",
      action: "item_shared",
      category: "sharing",
      success: true,
      resourceType: itemType,
      resourceId: item,
      resourceTitle: item,
      metadata: { receiver: receiverUsername, permissions },
    });

    return { success: true, data: null };
  } catch (error) {
    await logAudit({
      level: "ERROR",
      action: "item_shared",
      category: "sharing",
      success: false,
      resourceType: itemType,
      resourceId: item,
      resourceTitle: item,
      errorMessage:
        error instanceof Error ? error.message : "Failed to share item",
    });
    console.error("Error in shareWith:", error);
    return { success: false, error: "Failed to share item" };
  }
};

export const isItemSharedWith = async (
  item: string,
  categoryPath: string,
  itemType: ItemType,
  username: string
): Promise<boolean> => {
  const sharingData = await readShareFile(itemType);

  const userShares = sharingData[username] || [];

  let found = userShares.some((entry) => entry.uuid === item);

  if (!found && categoryPath) {
    const encodedCategory = encodeCategoryPath(categoryPath || "Uncategorized");
    found = userShares.some(
      (entry) => entry.id === item && entry.category === encodedCategory
    );
  }

  return found;
};

export const getItemPermissions = async (
  item: string,
  categoryPath: string,
  itemType: ItemType,
  username: string
): Promise<SharingPermissions | null> => {
  const sharingData = await readShareFile(itemType);

  const userShares = sharingData[username] || [];

  let entry = userShares.find((entry) => entry.uuid === item);

  if (!entry && categoryPath) {
    const encodedCategory = encodeCategoryPath(categoryPath || "Uncategorized");
    entry = userShares.find(
      (entry) => entry.id === item && entry.category === encodedCategory
    );
  }

  return entry ? entry.permissions : null;
};

export const canUserReadItem = async (
  item: string,
  categoryPath: string,
  itemType: ItemType,
  username: string
): Promise<boolean> => {
  const permissions = await getItemPermissions(
    item,
    categoryPath,
    itemType,
    username
  );
  return permissions ? permissions.canRead : false;
};

export const canUserWriteItem = async (
  item: string,
  categoryPath: string,
  itemType: ItemType,
  username: string
): Promise<boolean> => {
  const permissions = await getItemPermissions(
    item,
    categoryPath,
    itemType,
    username
  );
  return permissions ? permissions.canEdit : false;
};

export const canUserDeleteItem = async (
  item: string,
  categoryPath: string,
  itemType: ItemType,
  username: string
): Promise<boolean> => {
  const permissions = await getItemPermissions(
    item,
    categoryPath,
    itemType,
    username
  );
  return permissions ? permissions.canDelete : false;
};

export const checkUserPermission = async (
  itemId: string,
  itemCategory: string,
  itemType: ItemType,
  currentUsername: string,
  permission: PermissionTypes
): Promise<boolean> => {
  try {
    const isAdminUser = await isAdmin();
    if (isAdminUser) return true;

    const userDir =
      itemType === ItemTypes.CHECKLIST
        ? CHECKLISTS_DIR(currentUsername)
        : NOTES_DIR(currentUsername);
    const categoryDir = path.join(userDir, itemCategory);
    const filePath = path.join(categoryDir, `${itemId}.md`);

    try {
      await fs.access(filePath);
      return true;
    } catch {}

    let owner = null;
    if (itemType === ItemTypes.CHECKLIST) {
      const { getUserByChecklistUuid } = await import(
        "@/app/_server/actions/users"
      );
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

    if (owner?.username === currentUsername) return true;

    switch (permission) {
      case PermissionTypes.READ:
        return await canUserReadItem(
          itemId,
          itemCategory,
          itemType,
          currentUsername
        );
      case PermissionTypes.EDIT:
        return await canUserWriteItem(
          itemId,
          itemCategory,
          itemType,
          currentUsername
        );
      case PermissionTypes.DELETE:
        return await canUserDeleteItem(
          itemId,
          itemCategory,
          itemType,
          currentUsername
        );
      default:
        return false;
    }
  } catch (error) {
    console.error("Error in checkUserPermission:", error);
    return false;
  }
};

export const unshareWith = async (
  item: string,
  categoryPath: string,
  sharerUsername: string,
  receiverUsername: string,
  itemType: ItemType
): Promise<Result<null>> => {
  const sharingData = await readShareFile(itemType);
  const encodedCategory = encodeCategoryPath(categoryPath || "Uncategorized");

  if (sharingData[receiverUsername]) {
    const entryIndex = sharingData[receiverUsername].findIndex(
      (entry) => entry.uuid === item
    );

    if (entryIndex !== -1) {
      sharingData[receiverUsername].splice(entryIndex, 1);
    } else {
      sharingData[receiverUsername] = sharingData[receiverUsername].filter(
        (entry) =>
          !(
            entry.id === item &&
            entry.sharer === sharerUsername &&
            entry.category === encodedCategory
          )
      );
    }

    if (sharingData[receiverUsername].length === 0) {
      delete sharingData[receiverUsername];
    }
  }
  try {
    await writeShareFile(itemType, sharingData);
    await logAudit({
      level: "INFO",
      action: "item_unshared",
      category: "sharing",
      success: true,
      resourceType: itemType,
      resourceId: item,
      resourceTitle: item,
      metadata: { receiver: receiverUsername },
    });
  } catch (error) {
    await logAudit({
      level: "ERROR",
      action: "item_unshared",
      category: "sharing",
      success: false,
      resourceType: itemType,
      resourceId: item,
      resourceTitle: item,
      errorMessage: "Failed to write unshare file",
    });
    return { success: false, error: "Failed to write unshare file" };
  }

  return { success: true };
};

export const getAllSharedItemsForUser = async (
  username: string
): Promise<{ notes: SharedItemEntry[]; checklists: SharedItemEntry[] }> => {
  const notesSharing = await readShareFile(ItemTypes.NOTE);
  const checklistsSharing = await readShareFile(ItemTypes.CHECKLIST);

  return {
    notes: notesSharing[username] || [],
    checklists: checklistsSharing[username] || [],
  };
};

export const getAllSharedItems = async (): Promise<{
  notes: Array<{ id: string; category: string }>;
  checklists: Array<{ id: string; category: string }>;
  public: {
    notes: Array<{ id: string; category: string }>;
    checklists: Array<{ id: string; category: string }>;
  };
}> => {
  const [notesSharing, checklistsSharing] = await Promise.all([
    readShareFile(ItemTypes.NOTE),
    readShareFile(ItemTypes.CHECKLIST),
  ]);

  const allNotes: Array<{ id: string; category: string }> = [];
  const allChecklists: Array<{ id: string; category: string }> = [];
  const publicNotes: Array<{ id: string; category: string }> = [];
  const publicChecklists: Array<{ id: string; category: string }> = [];

  Object.values(notesSharing).forEach((userShares) => {
    userShares.forEach((entry) => {
      if (entry.id && entry.category) {
        allNotes.push({ id: entry.id, category: entry.category });
      }
    });
  });

  Object.values(checklistsSharing).forEach((userShares) => {
    userShares.forEach((entry) => {
      if (entry.id && entry.category) {
        allChecklists.push({ id: entry.id, category: entry.category });
      }
    });
  });

  if (notesSharing.public) {
    for (const entry of notesSharing.public) {
      if (entry.id && entry.category) {
        publicNotes.push({ id: entry.id, category: entry.category });
      } else if (entry.uuid && entry.id) {
        const { getNoteById } = await import("@/app/_server/actions/note");
        const note = await getNoteById(entry.uuid);
        if (note) {
          publicNotes.push({
            id: note.id,
            category: note.category || "Uncategorized",
          });
        }
      }
    }
  }

  if (checklistsSharing.public) {
    for (const entry of checklistsSharing.public) {
      if (entry.id && entry.category) {
        publicChecklists.push({ id: entry.id, category: entry.category });
      } else if (entry.uuid && entry.id) {
        const { getListById } = await import("@/app/_server/actions/checklist");
        const checklist = await getListById(entry.uuid);
        if (checklist) {
          publicChecklists.push({
            id: checklist.id,
            category: checklist.category || "Uncategorized",
          });
        }
      }
    }
  }

  const deduplicate = (items: Array<{ id: string; category: string }>) =>
    items.filter(
      (item, index, array) =>
        array.findIndex(
          (i) => i.id === item.id && i.category === item.category
        ) === index
    );

  return {
    notes: deduplicate(allNotes),
    checklists: deduplicate(allChecklists),
    public: {
      notes: deduplicate(publicNotes),
      checklists: deduplicate(publicChecklists),
    },
  };
};

export const updateSharingData = async (
  previousItem: SharingItemUpdate,
  newItem: SharingItemUpdate | null
): Promise<void> => {
  const sharingData = await readShareFile(previousItem.itemType);
  let hasChanges = false;

  if (newItem === null) {
    Object.keys(sharingData).forEach((username) => {
      const originalLength = sharingData[username].length;
      sharingData[username] = sharingData[username].filter(
        (entry) =>
          !(
            entry.id === previousItem.id &&
            entry.category ===
              encodeCategoryPath(previousItem.category || "Uncategorized")
          )
      );
      if (sharingData[username].length !== originalLength) {
        hasChanges = true;
      }
      if (sharingData[username].length === 0) {
        delete sharingData[username];
      }
    });
  } else {
    const prevCategory = previousItem.category
      ? encodeCategoryPath(previousItem.category)
      : null;
    const newCategory = newItem.category
      ? encodeCategoryPath(newItem.category)
      : null;

    Object.keys(sharingData).forEach((username) => {
      sharingData[username].forEach((entry) => {
        let updated = false;

        if (
          !previousItem.id &&
          newItem.sharer &&
          entry.sharer === previousItem.sharer
        ) {
          entry.sharer = newItem.sharer;
          updated = true;
        } else if (previousItem.id) {
          if (
            entry.id === previousItem.id &&
            entry.category ===
              (prevCategory || encodeCategoryPath("Uncategorized")) &&
            newItem.id !== previousItem.id
          ) {
            entry.id = newItem.id;
            updated = true;
          }

          if (
            entry.id === (newItem.id || previousItem.id) &&
            entry.category ===
              (prevCategory || encodeCategoryPath("Uncategorized")) &&
            newCategory &&
            newCategory !==
              (prevCategory || encodeCategoryPath("Uncategorized"))
          ) {
            entry.category = newCategory;
            updated = true;
          }

          if (
            newItem.sharer &&
            entry.sharer === previousItem.sharer &&
            entry.id === (newItem.id || previousItem.id) &&
            entry.category ===
              (newCategory ||
                prevCategory ||
                encodeCategoryPath("Uncategorized")) &&
            newItem.sharer !== previousItem.sharer
          ) {
            entry.sharer = newItem.sharer;
            updated = true;
          }
        }

        if (updated) {
          hasChanges = true;
        }
      });
    });
  }

  if (hasChanges) {
    await writeShareFile(previousItem.itemType, sharingData);
  }
};

export const updateItemPermissions = async (
  item: string,
  categoryPath: string,
  itemType: ItemType,
  username: string,
  permissions: SharingPermissions
): Promise<Result<null>> => {
  const sharingData = await readShareFile(itemType);
  const encodedCategory = encodeCategoryPath(categoryPath || "Uncategorized");

  if (!sharingData[username]) {
    await logAudit({
      level: "WARNING",
      action: "share_permissions_updated",
      category: "sharing",
      success: false,
      resourceType: itemType,
      resourceId: item,
      errorMessage: "Item not shared with this user",
      metadata: { targetUser: username },
    });
    return { success: false, error: "Item not shared with this user" };
  }

  let entryIndex = sharingData[username].findIndex(
    (entry) => entry.uuid === item
  );

  if (entryIndex === -1) {
    entryIndex = sharingData[username].findIndex(
      (entry) => entry.id === item && entry.category === encodedCategory
    );
  }

  if (entryIndex === -1) {
    await logAudit({
      level: "WARNING",
      action: "share_permissions_updated",
      category: "sharing",
      success: false,
      resourceType: itemType,
      resourceId: item,
      errorMessage: "Item not shared with this user",
      metadata: { targetUser: username },
    });
    return { success: false, error: "Item not shared with this user" };
  }

  const oldPermissions = sharingData[username][entryIndex].permissions;
  sharingData[username][entryIndex].permissions = permissions;

  try {
    await writeShareFile(itemType, sharingData);
    await logAudit({
      level: "INFO",
      action: "share_permissions_updated",
      category: "sharing",
      success: true,
      resourceType: itemType,
      resourceId: item,
      metadata: {
        targetUser: username,
        oldPermissions,
        newPermissions: permissions,
      },
    });
    return { success: true, data: null };
  } catch (error) {
    await logAudit({
      level: "ERROR",
      action: "share_permissions_updated",
      category: "sharing",
      success: false,
      resourceType: itemType,
      resourceId: item,
      errorMessage: "Failed to update permissions",
      metadata: { targetUser: username },
    });
    return { success: false, error: "Failed to update permissions" };
  }
};

export const updateReceiverUsername = async (
  oldUsername: string,
  newUsername: string,
  itemType: ItemType
): Promise<void> => {
  const sharingData = await readShareFile(itemType);

  if (sharingData[oldUsername]) {
    sharingData[newUsername] = sharingData[oldUsername];
    delete sharingData[oldUsername];

    await writeShareFile(itemType, sharingData);
  }
};

export type { SharingPermissions };
