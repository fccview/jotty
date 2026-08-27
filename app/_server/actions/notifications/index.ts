"use server";

import { AppNotification, AppNotificationData } from "@/app/_types";
import { Modes, NotificationTargets } from "@/app/_types/enums";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getListById } from "@/app/_server/actions/checklist";
import { getNoteById } from "@/app/_server/actions/note";
import { mountsFor } from "@/app/_server/actions/share/mounts";
import { notifyUser, readNotificationsForUser, writeNotificationsForUser } from "./internal";

const CATEGORY_MODES: Partial<Record<NotificationTargets, Modes>> = {
  [NotificationTargets.NOTE_CATEGORY]: Modes.NOTES,
  [NotificationTargets.CHECKLIST_CATEGORY]: Modes.CHECKLISTS,
};

const _folderLink = async (
  mode: Modes,
  username: string,
  categoryUuid: string,
): Promise<string | undefined> => {
  const mounts = await mountsFor(mode, username);
  const mount = mounts.find((entry) => entry.categoryUuid === categoryUuid);

  if (!mount) return undefined;

  return `/?mode=${mode}&category=${encodeURIComponent(mount.displayName)}`;
};

const _resolveLink = async (
  username: string,
  data?: AppNotificationData,
): Promise<string | undefined> => {
  if (!data?.itemId || !data?.itemType) return undefined;

  try {
    const folderMode = CATEGORY_MODES[data.itemType];

    if (folderMode) {
      return _folderLink(folderMode, username, data.itemId);
    }

    if (data.itemType === NotificationTargets.CHECKLIST) {
      const list = await getListById(data.itemId);
      if (list) return `/checklist/${list.uuid}`;
    }
    if (data.itemType === NotificationTargets.NOTE) {
      const note = await getNoteById(data.itemId);
      if (note) return `/note/${note.uuid}`;
    }
  } catch (error) {
    console.error("[notifications] could not resolve link:", error);
  }

  return undefined;
};

/** Authorizes the target: self or admin only. Cross-user flows use `notifyUser`. */
export const createNotificationForUser = async (
  username: string,
  data: Omit<AppNotification, "id" | "createdAt" | "link">,
): Promise<{ success: boolean }> => {
  const caller = await getCurrentUser();
  if (!caller?.username) return { success: false };

  if (caller.username !== username && !caller.isAdmin) {
    return { success: false };
  }

  return notifyUser(username, data);
};

export const createNotification = async (
  data: Omit<AppNotification, "id" | "createdAt" | "link">,
): Promise<{ success: boolean }> => {
  const user = await getCurrentUser();
  if (!user?.username) return { success: false };
  return notifyUser(user.username, data);
};

export const getNotifications = async (): Promise<AppNotification[]> => {
  const user = await getCurrentUser();
  if (!user?.username) return [];

  const notifications = await readNotificationsForUser(user.username);

  return Promise.all(
    notifications.map(async (n) => ({
      ...n,
      link: await _resolveLink(user.username, n.data),
    })),
  );
};

export const markNotificationRead = async (id: string): Promise<{ success: boolean }> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) return { success: false };
    const notifications = await readNotificationsForUser(user.username);
    await writeNotificationsForUser(user.username, notifications.map((n) =>
      n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
    ));
    return { success: true };
  } catch {
    return { success: false };
  }
};

export const markAllNotificationsRead = async (): Promise<{ success: boolean }> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) return { success: false };
    const readAt = new Date().toISOString();
    const notifications = await readNotificationsForUser(user.username);
    await writeNotificationsForUser(user.username, notifications.map((n) => (n.readAt ? n : { ...n, readAt })));
    return { success: true };
  } catch {
    return { success: false };
  }
};

export const removeNotification = async (id: string): Promise<{ success: boolean }> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) return { success: false };
    const notifications = await readNotificationsForUser(user.username);
    await writeNotificationsForUser(user.username, notifications.filter((n) => n.id !== id));
    return { success: true };
  } catch {
    return { success: false };
  }
};

export const clearNotifications = async (): Promise<{ success: boolean }> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) return { success: false };
    await writeNotificationsForUser(user.username, []);
    return { success: true };
  } catch {
    return { success: false };
  }
};
