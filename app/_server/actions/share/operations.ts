"use server";

import path from "path";
import { Modes, NotificationTargets } from "@/app/_types/enums";
import { Result, SharingPermissions } from "@/app/_types/core";
import {
  DETACH_LOSSY,
  NO_SHARED_PARENT,
  PUBLIC_USER,
  SHARED_WITH_KEY,
} from "@/app/_consts/sharing";
import { logAudit } from "@/app/_server/actions/log";
import { serverReadFile, serverWriteFile } from "@/app/_server/actions/file";
import {
  extractYamlMetadata,
  updateYamlMetadata,
} from "@/app/_utils/yaml-metadata-utils";
import { getTranslations } from "next-intl/server";
import { notifyUser } from "@/app/_server/actions/notifications/internal";
import { getCurrentUser, getUsername } from "@/app/_server/actions/users";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { catDirByUuid, mutateCatInfo } from "./category-info";
import { resolveAccess, catAccess } from "./access";
import {
  Grants,
  READ_ONLY,
  announceShare,
  gandalf,
  grantItem,
  isChecklistMode,
  itemTypeOf,
  itemPathOf,
  lockRefusal,
  lossyOnItem,
  ownerOf,
  revokeItem,
  unwelcome,
  userDirOf,
  writeShares,
} from "./grants";

const _catDir = async (
  mode: Modes,
  owner: string,
  categoryUuid: string,
): Promise<string | null> => {
  if (!categoryUuid) return null;

  const baseDir = path.join(process.cwd(), userDirOf(mode, owner));
  return catDirByUuid(baseDir, categoryUuid);
};

const _gandalf = async (owner: string): Promise<string | null> =>
  gandalf(owner, await getCurrentUser());

const FOLDER_TARGET: Record<Modes.CHECKLISTS | Modes.NOTES, NotificationTargets> = {
  [Modes.CHECKLISTS]: NotificationTargets.CHECKLIST_CATEGORY,
  [Modes.NOTES]: NotificationTargets.NOTE_CATEGORY,
};

const _tellFolder = async (
  mode: Modes,
  categoryUuid: string,
  folderName: string,
  sharer: string,
  receiver: string,
): Promise<void> => {
  if (receiver === PUBLIC_USER || receiver === sharer) return;

  try {
    const t = await getTranslations();
    const kind = isChecklistMode(mode) ? Modes.CHECKLISTS : Modes.NOTES;
    const label = t(isChecklistMode(mode) ? "common.checklist" : "common.note");

    await notifyUser(receiver, {
      type: "sharing",
      title: t("notifications.sharingFolderTitle", {
        user: sharer,
        type: label,
      }),
      message: t("notifications.sharingFolderMessage", { folder: folderName }),
      data: { itemId: categoryUuid, itemType: FOLDER_TARGET[kind] },
    });
  } catch (error) {
    console.error(
      `Failed to notify ${receiver} about folder ${categoryUuid}:`,
      error,
    );
  }
};

export const shareItem = async (
  mode: Modes,
  uuid: string,
  receiver: string,
  permissions: SharingPermissions = READ_ONLY,
): Promise<Result<Grants>> =>
  grantItem(await getCurrentUser(), mode, uuid, receiver, permissions);

export const unshareItem = async (
  mode: Modes,
  uuid: string,
  receiver: string,
): Promise<Result<Grants>> =>
  revokeItem(await getCurrentUser(), mode, uuid, receiver);

const _detach = async (
  mode: Modes,
  uuid: string,
): Promise<Result<Grants>> => {
  try {
    const owner = await ownerOf(mode, uuid);
    if (!owner) return { success: false, error: "Item not found" };

    const locked = await lockRefusal(mode, uuid);
    if (locked) return { success: false, error: locked };

    const refusal = await _gandalf(owner);
    if (refusal) return { success: false, error: refusal };

    const filePath = await itemPathOf(mode, uuid, owner);
    if (!filePath) return { success: false, error: "Item not found" };

    const access = await resolveAccess(mode, filePath);
    if (!access) return { success: false, error: "Item not found" };
    if (!access.inherited || !access.viaCategory) {
      return { success: true, data: access.users };
    }

    if (lossyOnItem(access.users)) {
      return { success: false, error: DETACH_LOSSY };
    }

    const written = await writeShares(filePath, access.users);
    if (!written) return { success: false, error: "Failed to update sharing" };

    await logAudit({
      level: "INFO",
      action: "item_shared",
      category: "sharing",
      success: true,
      resourceType: itemTypeOf(mode),
      resourceId: uuid,
      metadata: { detachedFrom: access.viaCategory },
    });

    await announceShare(mode, uuid, [owner]);

    return { success: true, data: access.users };
  } catch (error) {
    console.error("Error in detachItem:", error);
    return { success: false, error: "Failed to update sharing" };
  }
};

export const detachItem = async (
  mode: Modes,
  uuid: string,
): Promise<Result<Grants>> =>
  runQueued(itemLane(mode, uuid), () => _detach(mode, uuid));

const _inherit = async (
  mode: Modes,
  uuid: string,
): Promise<Result<null>> => {
  try {
    const owner = await ownerOf(mode, uuid);
    if (!owner) return { success: false, error: "Item not found" };

    const locked = await lockRefusal(mode, uuid);
    if (locked) return { success: false, error: locked };

    const refusal = await _gandalf(owner);
    if (refusal) return { success: false, error: refusal };

    const filePath = await itemPathOf(mode, uuid, owner);
    if (!filePath) return { success: false, error: "Item not found" };

    const parent = await catAccess(mode, path.resolve(path.dirname(filePath)));
    if (!parent?.viaCategory) return { success: false, error: NO_SHARED_PARENT };

    const before = await resolveAccess(mode, filePath);

    const content = await serverReadFile(filePath);
    if (!content) return { success: false, error: "Item not found" };

    const { metadata, contentWithoutMetadata } = extractYamlMetadata(content);
    delete metadata[SHARED_WITH_KEY];

    await serverWriteFile(
      filePath,
      updateYamlMetadata(contentWithoutMetadata, metadata, false),
    );

    await logAudit({
      level: "INFO",
      action: "item_shared",
      category: "sharing",
      success: true,
      resourceType: itemTypeOf(mode),
      resourceId: uuid,
      metadata: { inheritedFrom: parent.viaCategory },
    });

    const affected = [
      ...Object.keys(before?.users || {}),
      ...Object.keys(parent.users),
    ].filter((username) => username !== PUBLIC_USER);

    await announceShare(mode, uuid, Array.from(new Set([owner, ...affected])));

    return { success: true, data: null };
  } catch (error) {
    console.error("Error in inheritItem:", error);
    return { success: false, error: "Failed to update sharing" };
  }
};

export const inheritItem = async (
  mode: Modes,
  uuid: string,
): Promise<Result<null>> =>
  runQueued(itemLane(mode, uuid), () => _inherit(mode, uuid));

export const shareFolder = async (
  mode: Modes,
  owner: string,
  categoryUuid: string,
  receiver: string,
  permissions: SharingPermissions = READ_ONLY,
): Promise<Result<string>> => {
  try {
    const refusal = await _gandalf(owner);
    if (refusal) return { success: false, error: refusal };

    const dir = await _catDir(mode, owner, categoryUuid);
    if (!dir) return { success: false, error: "Category not found" };

    const turnedAway = await unwelcome(owner, receiver, permissions);
    if (turnedAway) return { success: false, error: turnedAway };

    const written = await mutateCatInfo(dir, (info) => ({
      ...info,
      uuid: categoryUuid,
      sharing: {
        users: { ...(info.sharing?.users || {}), [receiver]: permissions },
        inherit: info.sharing?.inherit !== false,
      },
    }));

    if (!written) return { success: false, error: "Failed to share folder" };

    await logAudit({
      level: "INFO",
      action: "item_shared",
      category: "sharing",
      success: true,
      resourceType: itemTypeOf(mode),
      resourceId: categoryUuid,
      resourceTitle: path.relative(
        path.join(process.cwd(), userDirOf(mode, owner)),
        dir,
      ),
      metadata: { receiver, permissions, scope: "category" },
    });

    await announceShare(mode, categoryUuid, [owner, receiver]);
    await _tellFolder(
      mode,
      categoryUuid,
      path.basename(dir),
      owner,
      receiver,
    );

    return { success: true, data: categoryUuid };
  } catch (error) {
    console.error("Error in shareFolder:", error);
    return { success: false, error: "Failed to share folder" };
  }
};

export const unshareFolder = async (
  mode: Modes,
  owner: string,
  categoryUuid: string,
  receiver: string,
): Promise<Result<null>> => {
  try {
    const refusal = await _gandalf(owner);
    if (refusal) return { success: false, error: refusal };

    const dir = await _catDir(mode, owner, categoryUuid);

    if (!dir) return { success: false, error: "Category not found" };

    const written = await mutateCatInfo(dir, (info) => {
      const users = { ...(info.sharing?.users || {}) };
      delete users[receiver];
      return { ...info, sharing: { users, inherit: info.sharing?.inherit !== false } };
    });

    if (!written) return { success: false, error: "Failed to unshare folder" };

    await logAudit({
      level: "INFO",
      action: "item_unshared",
      category: "sharing",
      success: true,
      resourceType: itemTypeOf(mode),
      resourceId: categoryUuid,
      metadata: { receiver, scope: "category" },
    });

    await announceShare(mode, categoryUuid, [owner, receiver]);

    return { success: true, data: null };
  } catch (error) {
    console.error("Error in unshareFolder:", error);
    return { success: false, error: "Failed to unshare folder" };
  }
};

export const setFolderInherit = async (
  mode: Modes,
  owner: string,
  categoryUuid: string,
  inherit: boolean,
): Promise<Result<null>> => {
  try {
    const refusal = await _gandalf(owner);
    if (refusal) return { success: false, error: refusal };

    const dir = await _catDir(mode, owner, categoryUuid);
    if (!dir) return { success: false, error: "Category not found" };

    const written = await mutateCatInfo(dir, (info) => ({
      ...info,
      uuid: categoryUuid,
      sharing: { users: info.sharing?.users || {}, inherit },
    }));

    if (!written) return { success: false, error: "Failed to update folder" };

    await announceShare(mode, categoryUuid, [owner]);

    return { success: true, data: null };
  } catch (error) {
    console.error("Error in setFolderInherit:", error);
    return { success: false, error: "Failed to update folder" };
  }
};

export const setItemPublic = async (
  mode: Modes,
  uuid: string,
  isPublic: boolean,
): Promise<Result<Grants>> =>
  isPublic
    ? shareItem(mode, uuid, PUBLIC_USER, READ_ONLY)
    : unshareItem(mode, uuid, PUBLIC_USER);

export const setFolderPublic = async (
  mode: Modes,
  owner: string,
  categoryUuid: string,
  isPublic: boolean,
): Promise<Result<null>> => {
  if (!isPublic) {
    return unshareFolder(mode, owner, categoryUuid, PUBLIC_USER);
  }

  const result = await shareFolder(
    mode,
    owner,
    categoryUuid,
    PUBLIC_USER,
    READ_ONLY,
  );

  return result.success
    ? { success: true, data: null }
    : { success: false, error: result.error };
};

/**
 * Recipient-side removal of one's own grant. Access is derived from the owner's
 * files, so leaving means dropping the caller from the grant that reaches them:
 * an explicit grant is edited in place, an inherited one is materialised at this
 * level (minus the caller) so everybody else keeps exactly what they had.
 */
const _leave = async (
  mode: Modes,
  uuid: string,
): Promise<Result<null>> => {
  try {
    const caller = await getUsername();
    if (!caller) return { success: false, error: "Not authenticated" };

    const owner = await ownerOf(mode, uuid);
    if (!owner) return { success: false, error: "Item not found" };

    const locked = await lockRefusal(mode, uuid);
    if (locked) return { success: false, error: locked };
    if (owner === caller) {
      return { success: false, error: "You own this item" };
    }

    const filePath = await itemPathOf(mode, uuid, owner);
    if (!filePath) return { success: false, error: "Item not found" };

    const access = await resolveAccess(mode, filePath);
    if (!access?.users[caller]) {
      return { success: false, error: "Not shared with you" };
    }

    const next = { ...access.users };
    delete next[caller];
    if (access.inherited && lossyOnItem(next)) {
      return { success: false, error: DETACH_LOSSY };
    }

    const written = await writeShares(filePath, next);
    if (!written) return { success: false, error: "Failed to leave share" };

    await logAudit({
      level: "INFO",
      action: "item_unshared",
      category: "sharing",
      success: true,
      resourceType: itemTypeOf(mode),
      resourceId: uuid,
      metadata: { receiver: caller, left: true, wasInherited: access.inherited },
    });

    await announceShare(mode, uuid, [owner, caller]);

    return { success: true, data: null };
  } catch (error) {
    console.error("Error in leaveItem:", error);
    return { success: false, error: "Failed to leave share" };
  }
};

export const leaveItem = async (
  mode: Modes,
  uuid: string,
): Promise<Result<null>> =>
  runQueued(itemLane(mode, uuid), () => _leave(mode, uuid));

export const leaveFolder = async (
  mode: Modes,
  owner: string,
  categoryUuid: string,
): Promise<Result<null>> => {
  try {
    const caller = await getUsername();
    if (!caller) return { success: false, error: "Not authenticated" };
    if (owner === caller) {
      return { success: false, error: "You own this folder" };
    }

    const dir = await _catDir(mode, owner, categoryUuid);

    if (!dir) return { success: false, error: "Category not found" };

    let isInherited = false;
    let sharedWithCaller = true;

    const written = await mutateCatInfo(dir, async (info) => {
      const access = await catAccess(mode, dir);
      if (!access?.users[caller]) {
        sharedWithCaller = false;
        return null;
      }

      const fromAbove = await catAccess(mode, path.dirname(dir));
      isInherited = Boolean(fromAbove?.users[caller]);

      const users = isInherited
        ? { ...access.users }
        : { ...(info.sharing?.users || {}) };
      delete users[caller];
      return {
        ...info,
        uuid: info.uuid || categoryUuid,
        sharing: {
          users,
          inherit: isInherited ? false : info.sharing?.inherit !== false,
        },
      };
    });

    if (!sharedWithCaller) {
      return { success: false, error: "Not shared with you" };
    }
    if (!written) return { success: false, error: "Failed to leave share" };

    await logAudit({
      level: "INFO",
      action: "item_unshared",
      category: "sharing",
      success: true,
      resourceType: itemTypeOf(mode),
      resourceId: categoryUuid,
      metadata: { receiver: caller, left: true, scope: "category", isInherited },
    });

    await announceShare(mode, categoryUuid, [owner, caller]);

    return { success: true, data: null };
  } catch (error) {
    console.error("Error in leaveFolder:", error);
    return { success: false, error: "Failed to leave share" };
  }
};
