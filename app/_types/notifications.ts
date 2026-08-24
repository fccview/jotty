import { NotificationTargets } from "./enums";

export type NotificationType = "reminder" | "assignment" | "sharing" | "system" | "mention";

export interface AppNotificationData {
  itemId: string;
  itemType: NotificationTargets;
  taskId?: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  titleKey?: string;
  messageKey?: string;
  messageVars?: Record<string, string>;
  createdAt: string;
  readAt?: string;
  link?: string;
  data?: AppNotificationData;
}
