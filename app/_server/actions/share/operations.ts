"use server";

import path from "path";
import { revalidateTag } from "next/cache";
import { Modes, ItemTypes } from "@/app/_types/enums";
import { Result, SharingPermissions } from "@/app/_types/core";
import { PUBLIC_USER, SHARED_WITH_KEY } from "@/app/_consts/sharing";
import { NOTES_DIR, CHECKLISTS_DIR } from "@/app/_consts/files";
import { logAudit } from "@/app/_server/actions/log";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { serverReadFile, serverWriteFile } from "@/app/_server/actions/file";
import {
  extractYamlMetadata,
  updateYamlMetadata,
} from "@/app/_utils/yaml-metadata-utils";
import { toSharedWith } from "@/app/_utils/sharing-utils";
import { grepFindFileByUuid } from "@/app/_utils/grep-utils";
import { getTranslations } from "next-intl/server";
import { createNotificationForUser } from "@/app/_server/actions/notifications";
import { getUserByNoteUuid, getUserByChecklistUuid } from "@/app/_server/actions/users";
import { readCatInfo, writeCatInfo, catDirByUuid, catUuid } from "./category-info";
import { resolveAccess } from "./access";

const READ_ONLY: SharingPermissions = {
  canRead: true,
  canEdit: false,
  canDelete: false,
};

const _modeTag = (mode: Modes): string =>
  mode === Modes.CHECKLISTS ? "layout-checklists" : "layout-notes";

const _userDir = (mode: Modes, username: string): string =>
  mode === Modes.CHECKLISTS ? CHECKLISTS_DIR(username) : NOTES_DIR(username);

const _ownerOf = async (
  mode: Modes,
  uuid: string,
): Promise<string | null> => {
  const result =
    mode === Modes.CHECKLISTS
      ? await getUserByChecklistUuid(uuid)
      : await getUserByNoteUuid(uuid);

  return result.success && result.data ? result.data.username : null;
};

const _itemPath = async (
  mode: Modes,
  uuid: string,
  owner: string,
): Promise<string | null> => {
  const absDir = path.join(process.cwd(), _userDir(mode, owner));
  const found = await grepFindFileByUuid(absDir, uuid);

  return found ? found.filePath : null;
};

const _notify = async (
  mode: Modes,
  uuid: string,
  affected: string[],
): Promise<void> => {
  revalidateTag(_modeTag(mode), { expire: 0 });

  await Promise.all(
    affected.map((username) =>
      broadcast({
        type: "sharing",
        action: "updated",
        entityId: uuid,
        username,
      }),
    ),
  );
};

const _tell = async (
  mode: Modes,
  uuid: string,
  sharer: string,
  receiver: string,
): Promise<void> => {
  if (receiver === PUBLIC_USER || receiver === sharer) return;

  try {
    const label = mode === Modes.CHECKLISTS ? "checklist" : "note";
    const t = await getTranslations("notifications");

    await createNotificationForUser(receiver, {
      type: "sharing",
      title: t("sharingTitle", { user: sharer, type: label }),
      message: t("sharingMessage", { type: label }),
      data: { itemId: uuid, itemType: label },
    });
  } catch (error) {
    console.error(`Failed to notify ${receiver} about ${uuid}:`, error);
  }
};

const _writeShares = async (
  filePath: string,
  users: Record<string, SharingPermissions>,
): Promise<boolean> => {
  try {
    const content = await serverReadFile(filePath);
    if (!content) return false;

    const updated = updateYamlMetadata(content, {
      [SHARED_WITH_KEY]: toSharedWith(users),
    });

    await serverWriteFile(filePath, updated);
    return true;
  } catch (error) {
    console.error(`Failed to write shares for ${filePath}:`, error);
    return false;
  }
};

export const shareItem = async (
  mode: Modes,
  uuid: string,
  receiver: string,
  permissions: SharingPermissions = READ_ONLY,
): Promise<Result<null>> => {
  try {
    const owner = await _ownerOf(mode, uuid);
    if (!owner) return { success: false, error: "Item not found" };

    const filePath = await _itemPath(mode, uuid, owner);
    if (!filePath) return { success: false, error: "Item not found" };

    const access = await resolveAccess(mode, filePath);
    const current = access && !access.inherited ? access.users : {};

    const written = await _writeShares(filePath, {
      ...current,
      [receiver]: permissions,
    });

    if (!written) return { success: false, error: "Failed to share item" };

    await logAudit({
      level: "INFO",
      action: "item_shared",
      category: "sharing",
      success: true,
      resourceType: mode === Modes.CHECKLISTS ? ItemTypes.CHECKLIST : ItemTypes.NOTE,
      resourceId: uuid,
      metadata: { receiver, permissions },
    });

    await _notify(mode, uuid, [owner, receiver]);
    await _tell(mode, uuid, owner, receiver);

    return { success: true, data: null };
  } catch (error) {
    console.error("Error in shareItem:", error);
    return { success: false, error: "Failed to share item" };
  }
};

export const unshareItem = async (
  mode: Modes,
  uuid: string,
  receiver: string,
): Promise<Result<null>> => {
  try {
    const owner = await _ownerOf(mode, uuid);
    if (!owner) return { success: false, error: "Item not found" };

    const filePath = await _itemPath(mode, uuid, owner);
    if (!filePath) return { success: false, error: "Item not found" };

    const access = await resolveAccess(mode, filePath);
    if (!access) return { success: false, error: "Item not found" };

    const next = { ...access.users };
    delete next[receiver];

    const written = await _writeShares(filePath, next);
    if (!written) return { success: false, error: "Failed to unshare item" };

    await logAudit({
      level: "INFO",
      action: "item_unshared",
      category: "sharing",
      success: true,
      resourceType: mode === Modes.CHECKLISTS ? ItemTypes.CHECKLIST : ItemTypes.NOTE,
      resourceId: uuid,
      metadata: { receiver, wasInherited: access.inherited },
    });

    await _notify(mode, uuid, [owner, receiver]);

    return { success: true, data: null };
  } catch (error) {
    console.error("Error in unshareItem:", error);
    return { success: false, error: "Failed to unshare item" };
  }
};

export const optOutItem = async (
  mode: Modes,
  uuid: string,
): Promise<Result<null>> => {
  try {
    const owner = await _ownerOf(mode, uuid);
    if (!owner) return { success: false, error: "Item not found" };

    const filePath = await _itemPath(mode, uuid, owner);
    if (!filePath) return { success: false, error: "Item not found" };

    const access = await resolveAccess(mode, filePath);
    const affected = access ? Object.keys(access.users) : [];

    const written = await _writeShares(filePath, {});
    if (!written) return { success: false, error: "Failed to update sharing" };

    await logAudit({
      level: "INFO",
      action: "item_unshared",
      category: "sharing",
      success: true,
      resourceType: mode === Modes.CHECKLISTS ? ItemTypes.CHECKLIST : ItemTypes.NOTE,
      resourceId: uuid,
      metadata: { optedOut: true },
    });

    await _notify(mode, uuid, [owner, ...affected]);

    return { success: true, data: null };
  } catch (error) {
    console.error("Error in optOutItem:", error);
    return { success: false, error: "Failed to update sharing" };
  }
};

export const inheritItem = async (
  mode: Modes,
  uuid: string,
): Promise<Result<null>> => {
  try {
    const owner = await _ownerOf(mode, uuid);
    if (!owner) return { success: false, error: "Item not found" };

    const filePath = await _itemPath(mode, uuid, owner);
    if (!filePath) return { success: false, error: "Item not found" };

    const content = await serverReadFile(filePath);
    if (!content) return { success: false, error: "Item not found" };

    const { metadata, contentWithoutMetadata } = extractYamlMetadata(content);
    delete metadata[SHARED_WITH_KEY];

    await serverWriteFile(
      filePath,
      updateYamlMetadata(contentWithoutMetadata, metadata, false),
    );

    await _notify(mode, uuid, [owner]);

    return { success: true, data: null };
  } catch (error) {
    console.error("Error in inheritItem:", error);
    return { success: false, error: "Failed to update sharing" };
  }
};

export const shareFolder = async (
  mode: Modes,
  owner: string,
  categoryPath: string,
  receiver: string,
  permissions: SharingPermissions = READ_ONLY,
): Promise<Result<string>> => {
  try {
    const dir = path.join(process.cwd(), _userDir(mode, owner), categoryPath);
    const info = await readCatInfo(dir);
    const uuid = info.uuid || (await catUuid(dir));

    const users = { ...(info.sharing?.users || {}), [receiver]: permissions };

    const written = await writeCatInfo(dir, {
      ...info,
      uuid,
      sharing: { users, inherit: info.sharing?.inherit !== false },
    });

    if (!written) return { success: false, error: "Failed to share folder" };

    await logAudit({
      level: "INFO",
      action: "item_shared",
      category: "sharing",
      success: true,
      resourceType: mode === Modes.CHECKLISTS ? ItemTypes.CHECKLIST : ItemTypes.NOTE,
      resourceId: uuid,
      resourceTitle: categoryPath,
      metadata: { receiver, permissions, scope: "category" },
    });

    await _notify(mode, uuid, [owner, receiver]);
    await _tell(mode, uuid, owner, receiver);

    return { success: true, data: uuid };
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
    const baseDir = path.join(process.cwd(), _userDir(mode, owner));
    const dir = await catDirByUuid(baseDir, categoryUuid);

    if (!dir) return { success: false, error: "Category not found" };

    const info = await readCatInfo(dir);
    const users = { ...(info.sharing?.users || {}) };
    delete users[receiver];

    const written = await writeCatInfo(dir, {
      ...info,
      sharing: { users, inherit: info.sharing?.inherit !== false },
    });

    if (!written) return { success: false, error: "Failed to unshare folder" };

    await logAudit({
      level: "INFO",
      action: "item_unshared",
      category: "sharing",
      success: true,
      resourceType: mode === Modes.CHECKLISTS ? ItemTypes.CHECKLIST : ItemTypes.NOTE,
      resourceId: categoryUuid,
      metadata: { receiver, scope: "category" },
    });

    await _notify(mode, categoryUuid, [owner, receiver]);

    return { success: true, data: null };
  } catch (error) {
    console.error("Error in unshareFolder:", error);
    return { success: false, error: "Failed to unshare folder" };
  }
};

export const setFolderInherit = async (
  mode: Modes,
  owner: string,
  categoryPath: string,
  inherit: boolean,
): Promise<Result<null>> => {
  try {
    const dir = path.join(process.cwd(), _userDir(mode, owner), categoryPath);
    const info = await readCatInfo(dir);
    const uuid = info.uuid || (await catUuid(dir));

    const written = await writeCatInfo(dir, {
      ...info,
      uuid,
      sharing: { users: info.sharing?.users || {}, inherit },
    });

    if (!written) return { success: false, error: "Failed to update folder" };

    await _notify(mode, uuid, [owner]);

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
): Promise<Result<null>> =>
  isPublic
    ? shareItem(mode, uuid, PUBLIC_USER, READ_ONLY)
    : unshareItem(mode, uuid, PUBLIC_USER);

export const setFolderPublic = async (
  mode: Modes,
  owner: string,
  categoryPath: string,
  isPublic: boolean,
): Promise<Result<null>> => {
  if (isPublic) {
    const result = await shareFolder(
      mode,
      owner,
      categoryPath,
      PUBLIC_USER,
      READ_ONLY,
    );
    return result.success
      ? { success: true, data: null }
      : { success: false, error: result.error };
  }

  const dir = path.join(process.cwd(), _userDir(mode, owner), categoryPath);
  const info = await readCatInfo(dir);

  return info.uuid
    ? unshareFolder(mode, owner, info.uuid, PUBLIC_USER)
    : { success: false, error: "Category not found" };
};
