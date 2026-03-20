export type NotificationType = "reminder" | "assignment" | "sharing" | "system";

export interface AppNotificationData {
  itemId: string;
  itemType: "checklist" | "note";
  taskId?: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
  link?: string;
  data?: AppNotificationData;
}
