"use server";

import { getFormData } from "@/app/_utils/global-utils";
import { getListById } from "@/app/_server/actions/checklist";
import { generateICS } from "@/app/_utils/kanban/calendar-utils";
import { parseItemsForCalendar, CalendarEvent } from "@/app/_utils/kanban/calendar-utils";

export const exportBoardAsICS = async (formData: FormData) => {
  try {
    const { listId, category } = getFormData(formData, ["listId", "category"]);

    const list = await getListById(listId, undefined, category);
    if (!list) return { error: "Board not found" };

    const icsContent = generateICS(list.items, list.title);
    return { success: true, data: icsContent };
  } catch (error) {
    console.error("Error exporting calendar:", error);
    return { error: "Failed to export calendar" };
  }
};

export const getCalendarEvents = async (formData: FormData) => {
  try {
    const { listId, category } = getFormData(formData, ["listId", "category"]);

    const list = await getListById(listId, undefined, category);
    if (!list) return { error: "Board not found" };

    const events: CalendarEvent[] = parseItemsForCalendar(list.items);
    return { success: true, data: events };
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return { error: "Failed to fetch calendar events" };
  }
};
