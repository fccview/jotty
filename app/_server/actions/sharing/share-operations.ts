"use server";

import { ItemType, Result, SharingPermissions } from "@/app/_types/core";
import { broadcast } from "@/app/_server/ws/broadcast";
import { ItemTypes } from "@/app/_types/enums";
import { encodeCategoryPath } from "@/app/_utils/global-utils";
import { logAudit } from "@/app/_server/actions/log";
import { getItemUuid } from "./helpers";
import { readShareFile, writeShareFile } from "./io";
import { SharedItemEntry } from "./types";
import { revalidateTag } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createNotificationForUser } from "@/app/_server/actions/notifications";

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

    revalidateTag(itemType === ItemTypes.CHECKLIST ? "layout-checklists" : "layout-notes", { expire: 0 });

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

    await broadcast({ type: "sharing", action: "updated", entityId: item, username: sharerUsername });

    const itemTypeLabel = itemType === ItemTypes.CHECKLIST ? "checklist" : "note";
    const t = await getTranslations("notifications");
    await createNotificationForUser(receiverUsername, {
      type: "sharing",
      title: t("sharingTitle", { user: sharerUsername, type: itemTypeLabel }),
      message: t("sharingMessage", { type: itemTypeLabel }),
      data: { itemId: itemUuid, itemType: itemTypeLabel },
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

    revalidateTag(itemType === ItemTypes.CHECKLIST ? "layout-checklists" : "layout-notes", { expire: 0 });

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

    await broadcast({ type: "sharing", action: "updated", entityId: item, username: sharerUsername });
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

    revalidateTag(itemType === ItemTypes.CHECKLIST ? "layout-checklists" : "layout-notes", { expire: 0 });

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

    await broadcast({ type: "sharing", action: "updated", entityId: item, username });

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
