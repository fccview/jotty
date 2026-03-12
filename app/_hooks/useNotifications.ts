"use client";

import { useState, useEffect, useCallback } from "react";
import { AppNotification } from "@/app/_types";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  removeNotification,
  clearNotifications,
} from "@/app/_server/actions/notifications";
import { useWebSocket } from "@/app/_providers/WebSocketProvider";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const { subscribe } = useWebSocket();

  const fetch = useCallback(async () => {
    const data = await getNotifications();
    setNotifications(data);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    return subscribe((event) => {
      if (event.type === "notification") fetch();
    });
  }, [subscribe, fetch]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    await markNotificationRead(id);
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    const readAt = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt })));
    await markAllNotificationsRead();
  }, []);

  const handleRemoveNotification = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await removeNotification(id);
  }, []);

  const handleClearAll = useCallback(async () => {
    setNotifications([]);
    await clearNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return {
    notifications,
    unreadCount,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    removeNotification: handleRemoveNotification,
    clearAll: handleClearAll,
    refresh: fetch,
  };
};
