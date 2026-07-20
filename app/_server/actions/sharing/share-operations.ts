"use server";

import { ItemType, Result, SharingPermissions } from "@/app/_types/core";
import { broadcast } from "@/app/_server/ws/broadcast";
import { ItemTypes } from "@/app/_types/enums";
import { logAudit } from "@/app/_server/actions/log";
import { readShareFile, writeShareFile } from "./io";
import { SharedItemEntry } from "./types";
import { revalidateTag } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createNotificationForUser } from "@/app/_server/actions/notifications";

export const shareWith = async (
  uuid: string,
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
    if (!uuid) {
      return {
        success: false,
        error:
          "This item needs to be saved first before it can be shared. Please edit and save the item to generate the required metadata.",
      };
    }

    const sharingData = await readShareFile(itemType);

    const newEntry: SharedItemEntry = {
      uuid,
      sharer: sharerUsername,
      permissions,
    };

    if (!sharingData[receiverUsername]) {
      sharingData[receiverUsername] = [];
    }

    sharingData[receiverUsername] = sharingData[receiverUsername].filter(
      (entry) => entry.uuid !== uuid
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
      resourceId: uuid,
      resourceTitle: uuid,
      metadata: { receiver: receiverUsername, permissions },
    });

    await broadcast({ type: "sharing", action: "updated", entityId: uuid, username: sharerUsername });

    const itemTypeLabel = itemType === ItemTypes.CHECKLIST ? "checklist" : "note";
    const t = await getTranslations("notifications");
    await createNotificationForUser(receiverUsername, {
      type: "sharing",
      title: t("sharingTitle", { user: sharerUsername, type: itemTypeLabel }),
      message: t("sharingMessage", { type: itemTypeLabel }),
      data: { itemId: uuid, itemType: itemTypeLabel },
    });

    return { success: true, data: null };
  } catch (error) {
    await logAudit({
      level: "ERROR",
      action: "item_shared",
      category: "sharing",
      success: false,
      resourceType: itemType,
      resourceId: uuid,
      resourceTitle: uuid,
      errorMessage:
        error instanceof Error ? error.message : "Failed to share item",
    });
    console.error("Error in shareWith:", error);
    return { success: false, error: "Failed to share item" };
  }
};

export const unshareWith = async (
  uuid: string,
  sharerUsername: string,
  receiverUsername: string,
  itemType: ItemType
): Promise<Result<null>> => {
  const sharingData = await readShareFile(itemType);

  if (sharingData[receiverUsername]) {
    sharingData[receiverUsername] = sharingData[receiverUsername].filter(
      (entry) => entry.uuid !== uuid
    );

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
      resourceId: uuid,
      resourceTitle: uuid,
      metadata: { receiver: receiverUsername },
    });

    await broadcast({ type: "sharing", action: "updated", entityId: uuid, username: sharerUsername });
  } catch (error) {
    await logAudit({
      level: "ERROR",
      action: "item_unshared",
      category: "sharing",
      success: false,
      resourceType: itemType,
      resourceId: uuid,
      resourceTitle: uuid,
      errorMessage: "Failed to write unshare file",
    });
    return { success: false, error: "Failed to write unshare file" };
  }

  return { success: true };
};

export const updateItemPermissions = async (
  uuid: string,
  itemType: ItemType,
  username: string,
  permissions: SharingPermissions
): Promise<Result<null>> => {
  const sharingData = await readShareFile(itemType);

  if (!sharingData[username]) {
    await logAudit({
      level: "WARNING",
      action: "share_permissions_updated",
      category: "sharing",
      success: false,
      resourceType: itemType,
      resourceId: uuid,
      errorMessage: "Item not shared with this user",
      metadata: { targetUser: username },
    });
    return { success: false, error: "Item not shared with this user" };
  }

  const entryIndex = sharingData[username].findIndex(
    (entry) => entry.uuid === uuid
  );

  if (entryIndex === -1) {
    await logAudit({
      level: "WARNING",
      action: "share_permissions_updated",
      category: "sharing",
      success: false,
      resourceType: itemType,
      resourceId: uuid,
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
      resourceId: uuid,
      metadata: {
        targetUser: username,
        oldPermissions,
        newPermissions: permissions,
      },
    });

    await broadcast({ type: "sharing", action: "updated", entityId: uuid, username });

    return { success: true, data: null };
  } catch (error) {
    await logAudit({
      level: "ERROR",
      action: "share_permissions_updated",
      category: "sharing",
      success: false,
      resourceType: itemType,
      resourceId: uuid,
      errorMessage: "Failed to update permissions",
      metadata: { targetUser: username },
    });
    return { success: false, error: "Failed to update permissions" };
  }
};
