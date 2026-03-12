"use client";

import { useEffect, useRef, useCallback } from "react";
import { Checklist } from "@/app/_types";
import { getDueReminders } from "@/app/_utils/kanban/reminder-utils";

const REMINDER_CHECK_INTERVAL = 60000;

export const useKanbanReminders = (checklist: Checklist) => {
  const notifiedRef = useRef<Set<string>>(new Set());

  const _sendNotification = useCallback((title: string, body: string) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    new Notification(title, {
      body,
      icon: "/icons/icon-192x192.png",
      tag: `jotty-reminder-${Date.now()}`,
    });
  }, []);

  const checkReminders = useCallback(() => {
    const dueItems = getDueReminders(checklist.items);

    dueItems.forEach((item) => {
      if (notifiedRef.current.has(item.id)) return;
      notifiedRef.current.add(item.id);

      _sendNotification(
        "Jotty Reminder",
        `${item.text} - ${checklist.title}`
      );
    });
  }, [checklist.items, checklist.title, _sendNotification]);

  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, REMINDER_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkReminders]);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }, []);

  return { requestPermission, checkReminders };
};
