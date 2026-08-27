import path from "path";
import { AppNotification, AppNotificationData } from "@/app/_types";
import { NOTIFICATIONS_FILE } from "@/app/_consts/files";
import { readJsonFile, writeJsonFile, ensureDir } from "@/app/_server/actions/file";
import { broadcast } from "@/app/_server/actions/ws/broadcast";

const DEDUP_WINDOW_MS = 60 * 60 * 1000;

const _getPath = (username: string): string => NOTIFICATIONS_FILE(username);

const _read = async (username: string): Promise<AppNotification[]> => {
  const data = await readJsonFile(_getPath(username));
  return Array.isArray(data) ? data : [];
};

const _write = async (
  username: string,
  notifications: AppNotification[],
): Promise<void> => {
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
  const key =
    type === "reminder"
      ? data?.taskId
      : type === "mention"
        ? data?.commentId
        : data?.itemId;
  if (!key) return false;

  return existing.some((n) => {
    if (n.type !== type) return false;
    if (new Date(n.createdAt).getTime() <= cutoff) return false;
    const nKey =
      n.type === "reminder"
        ? n.data?.taskId
        : n.type === "mention"
          ? n.data?.commentId
          : n.data?.itemId;
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

export const readNotificationsForUser = _read;
export const writeNotificationsForUser = _write;

/** Non-server-action notification writer; only callable from trusted server code. */
export const notifyUser = async (
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
    console.error("[notifications] notifyUser failed:", error);
    return { success: false };
  }
};