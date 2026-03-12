"use server";

import path from "path";
import { AppNotification, AppNotificationData } from "@/app/_types";
import { NOTIFICATIONS_FILE } from "@/app/_consts/files";
import { getCurrentUser } from "@/app/_server/actions/users";
import { readJsonFile, writeJsonFile, ensureDir } from "@/app/_server/actions/file";
import { broadcast } from "@/app/_server/ws/broadcast";
import { getListById } from "@/app/_server/actions/checklist";
import { getNoteById } from "@/app/_server/actions/note";

const DEDUP_WINDOW_MS = 60 * 60 * 1000;

const _getPath = (username: string): string => NOTIFICATIONS_FILE(username);

const _read = async (username: string): Promise<AppNotification[]> => {
  const data = await readJsonFile(_getPath(username));
  return Array.isArray(data) ? data : [];
};

const _write = async (username: string, notifications: AppNotification[]): Promise<void> => {
  const filePath = _getPath(username);
  await ensureDir(path.join(process.cwd(), path.dirname(filePath)));
  await writeJsonFile(notifications, filePath);
};

const _isDuplicate = (
  existing: AppNotification[],
  type: AppNotification["type"],
  data?: AppNotificationData,
): boolean => {
  if (type === "assignment") return false;

  const cutoff = Date.now() - DEDUP_WINDOW_MS;
  const key = type === "reminder" ? data?.taskId : data?.itemId;
  if (!key) return false;

  return existing.some((n) => {
    if (n.type !== type) return false;
    if (new Date(n.createdAt).getTime() <= cutoff) return false;
    const nKey = type === "reminder" ? n.data?.taskId : n.data?.itemId;
    return nKey === key;
  });
};

const _buildNotification = (
  data: Omit<AppNotification, "id" | "createdAt">,
): AppNotification => ({
  ...data,
  link: undefined,
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  createdAt: new Date().toISOString(),
});

const _resolveLink = async (data?: AppNotificationData): Promise<string | undefined> => {
  if (!data?.itemId || !data?.itemType) return undefined;

  try {
    if (data.itemType === "checklist") {
      const list = await getListById(data.itemId);
      if (list) return `/checklist/${list.category}/${list.id}`;
    }
    if (data.itemType === "note") {
      const note = await getNoteById(data.itemId);
      if (note) return `/note/${note.category}/${note.id}`;
    }
  } catch {}

  return undefined;
};

export const createNotificationForUser = async (
  username: string,
  data: Omit<AppNotification, "id" | "createdAt" | "link">,
): Promise<{ success: boolean }> => {
  try {
    const existing = await _read(username);
    if (_isDuplicate(existing, data.type, data.data)) return { success: true };

    await _write(username, [_buildNotification(data), ...existing]);
    await broadcast({ type: "notification", action: "created", username });
    return { success: true };
  } catch (error) {
    console.error("[notifications] createNotificationForUser failed:", error);
    return { success: false };
  }
};

export const createNotification = async (
  data: Omit<AppNotification, "id" | "createdAt" | "link">,
): Promise<{ success: boolean }> => {
  const user = await getCurrentUser();
  if (!user?.username) return { success: false };
  return createNotificationForUser(user.username, data);
};

export const getNotifications = async (): Promise<AppNotification[]> => {
  const user = await getCurrentUser();
  if (!user?.username) return [];

  const notifications = await _read(user.username);

  return Promise.all(
    notifications.map(async (n) => ({
      ...n,
      link: await _resolveLink(n.data),
    })),
  );
};

export const markNotificationRead = async (id: string): Promise<{ success: boolean }> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) return { success: false };
    const notifications = await _read(user.username);
    await _write(user.username, notifications.map((n) =>
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
    const notifications = await _read(user.username);
    await _write(user.username, notifications.map((n) => (n.readAt ? n : { ...n, readAt })));
    return { success: true };
  } catch {
    return { success: false };
  }
};

export const removeNotification = async (id: string): Promise<{ success: boolean }> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) return { success: false };
    const notifications = await _read(user.username);
    await _write(user.username, notifications.filter((n) => n.id !== id));
    return { success: true };
  } catch {
    return { success: false };
  }
};

export const clearNotifications = async (): Promise<{ success: boolean }> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) return { success: false };
    await _write(user.username, []);
    return { success: true };
  } catch {
    return { success: false };
  }
};
