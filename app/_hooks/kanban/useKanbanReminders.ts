"use client";

import { useEffect, useRef, useCallback } from "react";
import { Checklist } from "@/app/_types";
import { getDueReminders } from "@/app/_utils/kanban/reminder-utils";
import { createNotification } from "@/app/_server/actions/notifications";
import { markReminderNotified } from "@/app/_server/actions/kanban";
import { useTranslations } from "next-intl";

const REMINDER_CHECK_INTERVAL = 60000;

interface UseKanbanRemindersParams {
  checklist: Checklist;
  checklistId: string;
  category: string;
  onUpdate: (updatedChecklist: Checklist) => void;
}

export const useKanbanReminders = ({
  checklist,
  checklistId,
  category,
  onUpdate,
}: UseKanbanRemindersParams) => {
  const t = useTranslations();
  const notifiedRef = useRef<Set<string>>(new Set());

  const checkReminders = useCallback(async () => {
    const dueItems = getDueReminders(checklist.items);

    for (const item of dueItems) {
      if (notifiedRef.current.has(item.id)) continue;
      notifiedRef.current.add(item.id);

      await createNotification({
        type: "reminder",
        title: t("notifications.reminderTitle"),
        message: t("notifications.reminderMessage", {
          task: item.text,
          board: checklist.title,
        }),
        data: {
          itemId: checklist.uuid || checklistId,
          itemType: "checklist",
          taskId: item.id,
        },
      });

      const formData = new FormData();
      formData.append("listId", checklistId);
      formData.append("itemId", item.id);
      formData.append("category", category);
      const result = await markReminderNotified(formData);
      if (result.success && result.data) onUpdate(result.data);
    }
  }, [checklist.items, checklist.title, checklistId, category, onUpdate]);

  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, REMINDER_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkReminders]);
};
