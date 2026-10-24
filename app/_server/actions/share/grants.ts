import path from "path";
import { revalidateTag } from "next/cache";
import { getTranslations } from "next-intl/server";
import { Modes, ItemTypes, NotificationTargets } from "@/app/_types/enums";
import { Result, SharingPermissions } from "@/app/_types/core";
import type { SanitisedUser } from "@/app/_types";
import { DETACH_LOSSY, PUBLIC_USER, SHARED_WITH_KEY } from "@/app/_consts/sharing";
import { NOTES_DIR, CHECKLISTS_DIR } from "@/app/_consts/files";
import { logAudit } from "@/app/_server/actions/log";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { serverReadFile, serverWriteFile } from "@/app/_server/actions/file";
import { updateYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { storableOnItem, toSharedWith } from "@/app/_utils/sharing-utils";
import { grepFindFileByUuid } from "@/app/_utils/grep-utils";
import { notifyUser } from "@/app/_server/actions/notifications/internal";
import {
  getUserByNoteUuid,
  getUserByChecklistUuid,
} from "@/app/_server/actions/users";
import { findUserRecord } from "@/app/_server/actions/users/records";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { lockedNotice } from "@/app/_server/actions/lib/read-only-message";
import { isLockedUuid } from "./queries";
import { dropMounts } from "./mounts";
import { resolveAccess } from "./access";

export type Sharer = Pick<SanitisedUser, "username" | "isAdmin">;
export type Grants = Record<string, SharingPermissions>;

export const ITEM_MISSING = "Item not found";
export const NOT_OWNER = "You shall not pass";
export const NO_SUCH_USER = "Nobody by that username lives here";
export const OWN_ITEM = "You already own this item";
export const PUBLIC_READ_ONLY = "Public links are read only";
export const UNSTORABLE_PERMS = "Delete access needs edit access on an item";
export const SHARE_FAILED = "Failed to share item";
export const UNSHARE_FAILED = "Failed to unshare item";

export const READ_ONLY: SharingPermissions = {
  canRead: true,
  canEdit: false,
  canDelete: false,
};

export const isChecklistMode = (mode: Modes): boolean =>
  mode === Modes.CHECKLISTS;

export const itemTypeOf = (mode: Modes): ItemTypes =>
  isChecklistMode(mode) ? ItemTypes.CHECKLIST : ItemTypes.NOTE;

export const userDirOf = (mode: Modes, username: string): string =>
  isChecklistMode(mode) ? CHECKLISTS_DIR(username) : NOTES_DIR(username);

export const ownerOf = async (
  mode: Modes,
  uuid: string,
): Promise<string | null> => {
  const result = isChecklistMode(mode)
    ? await getUserByChecklistUuid(uuid)
    : await getUserByNoteUuid(uuid);

  return result.success && result.data ? result.data.username : null;
};

export const itemPathOf = async (
  mode: Modes,
  uuid: string,
  owner: string,
): Promise<string | null> => {
  const absDir = path.join(process.cwd(), userDirOf(mode, owner));
  const found = await grepFindFileByUuid(absDir, uuid);

  return found ? found.filePath : null;
};

export const gandalf = async (
  owner: string,
  sharer: Sharer | null,
): Promise<string | null> => {
  if (!sharer?.username) return "Not authenticated";
  if (sharer.username === owner) return null;
  if (sharer.isAdmin) return null;

  await logAudit({
    level: "WARNING",
    action: "item_shared",
    category: "sharing",
    success: false,
    metadata: { caller: sharer.username, owner, reason: "not the owner" },
  });

  return NOT_OWNER;
};

const _modeTag = (mode: Modes): string =>
  isChecklistMode(mode) ? "layout-checklists" : "layout-notes";

export const announceShare = async (
  mode: Modes,
  uuid: string,
  affected: string[],
): Promise<void> => {
  dropMounts(mode);
  revalidateTag(_modeTag(mode), { expire: 0 });
  if (mode === Modes.NOTES) void globalThis.__jottyLiveRecheck?.();

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

const ITEM_TARGET: Record<Modes.CHECKLISTS | Modes.NOTES, NotificationTargets> = {
  [Modes.CHECKLISTS]: NotificationTargets.CHECKLIST,
  [Modes.NOTES]: NotificationTargets.NOTE,
};

export const tellReceiver = async (
  mode: Modes,
  uuid: string,
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
      title: t("notifications.sharingTitle", { user: sharer, type: label }),
      message: t("notifications.sharingMessage", { type: label }),
      data: { itemId: uuid, itemType: ITEM_TARGET[kind] },
    });
  } catch (error) {
    console.error(`Failed to notify ${receiver} about ${uuid}:`, error);
  }
};

export const lockRefusal = async (mode: Modes, uuid: string): Promise<string | null> =>
  (await isLockedUuid(itemTypeOf(mode), uuid)) ? lockedNotice() : null;

export const writeShares = async (
  filePath: string,
  users: Grants,
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

export const lossyOnItem = (users: Grants): boolean =>
  !Object.values(users).every(storableOnItem);

export const unwelcome = async (
  owner: string,
  receiver: string,
  permissions: SharingPermissions,
): Promise<string | null> => {
  if (!receiver) return NO_SUCH_USER;
  if (receiver === owner) return OWN_ITEM;
  if (receiver === PUBLIC_USER) {
    return permissions.canEdit || permissions.canDelete ? PUBLIC_READ_ONLY : null;
  }
  return (await findUserRecord(receiver)) ? null : NO_SUCH_USER;
};

export const grantItem = async (
  sharer: Sharer | null,
  mode: Modes,
  uuid: string,
  receiver: string,
  permissions: SharingPermissions = READ_ONLY,
): Promise<Result<Grants>> => {
  try {
    const owner = await ownerOf(mode, uuid);
    if (!owner) return { success: false, error: ITEM_MISSING };
    const locked = await lockRefusal(mode, uuid);
    if (locked) return { success: false, error: locked };

    const refusal = await gandalf(owner, sharer);
    if (refusal) return { success: false, error: refusal };

    if (!storableOnItem(permissions)) {
      return { success: false, error: UNSTORABLE_PERMS };
    }

    const turnedAway = await unwelcome(owner, receiver, permissions);
    if (turnedAway) return { success: false, error: turnedAway };

    const result = await runQueued(
      itemLane(mode, uuid),
      async (): Promise<Result<Grants>> => {
        const filePath = await itemPathOf(mode, uuid, owner);
        if (!filePath) return { success: false, error: ITEM_MISSING };

        const access = await resolveAccess(mode, filePath);
        const next = { ...access?.users, [receiver]: permissions };
        if (access?.inherited && lossyOnItem(next)) {
          return { success: false, error: DETACH_LOSSY };
        }

        return (await writeShares(filePath, next))
          ? { success: true, data: next }
          : { success: false, error: SHARE_FAILED };
      },
    );

    if (!result.success) return result;

    await logAudit({
      level: "INFO",
      action: "item_shared",
      category: "sharing",
      success: true,
      resourceType: itemTypeOf(mode),
      resourceId: uuid,
      metadata: { receiver, permissions },
    });

    await announceShare(mode, uuid, [owner, receiver]);
    await tellReceiver(mode, uuid, owner, receiver);

    return result;
  } catch (error) {
    console.error("Error in grantItem:", error);
    return { success: false, error: SHARE_FAILED };
  }
};

interface Revoked {
  result: Result<Grants>;
  wasInherited: boolean;
  changed: boolean;
}

const _unchanged = (result: Result<Grants>): Revoked => ({
  result,
  wasInherited: false,
  changed: false,
});

export const revokeItem = async (
  sharer: Sharer | null,
  mode: Modes,
  uuid: string,
  receiver: string,
): Promise<Result<Grants>> => {
  try {
    const owner = await ownerOf(mode, uuid);
    if (!owner) return { success: false, error: ITEM_MISSING };

    const locked = await lockRefusal(mode, uuid);
    if (locked) return { success: false, error: locked };

    const refusal = await gandalf(owner, sharer);
    if (refusal) return { success: false, error: refusal };

    const { result, wasInherited, changed } = await runQueued(
      itemLane(mode, uuid),
      async (): Promise<Revoked> => {
        const filePath = await itemPathOf(mode, uuid, owner);
        if (!filePath) return _unchanged({ success: false, error: ITEM_MISSING });

        const access = await resolveAccess(mode, filePath);
        if (!access) return _unchanged({ success: false, error: ITEM_MISSING });
        if (!Object.hasOwn(access.users, receiver)) {
          return _unchanged({ success: true, data: access.users });
        }

        const next = { ...access.users };
        delete next[receiver];
        if (access.inherited && lossyOnItem(next)) {
          return _unchanged({ success: false, error: DETACH_LOSSY });
        }

        const written = await writeShares(filePath, next);
        return {
          result: written ? { success: true, data: next } : { success: false, error: UNSHARE_FAILED },
          wasInherited: access.inherited,
          changed: written,
        };
      },
    );

    if (!changed) return result;

    await logAudit({
      level: "INFO",
      action: "item_unshared",
      category: "sharing",
      success: true,
      resourceType: itemTypeOf(mode),
      resourceId: uuid,
      metadata: { receiver, wasInherited },
    });

    await announceShare(mode, uuid, [owner, receiver]);

    return result;
  } catch (error) {
    console.error("Error in revokeItem:", error);
    return { success: false, error: UNSHARE_FAILED };
  }
};
