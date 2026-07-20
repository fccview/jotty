"use server";

import { Item, TimeEntry } from "@/app/_types";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getListById } from "@/app/_server/actions/checklist";
import { getFormData } from "@/app/_utils/global-utils";

interface TempoData {
  itemId: string;
  itemText: string;
  entries: Record<string, { totalMinutes: number; entries: TimeEntry[] }>;
}

const _isWithinRange = (
  entryTime: string,
  startDate: string,
  endDate: string
): boolean => {
  const t = new Date(entryTime).getTime();
  return t >= new Date(startDate).getTime() && t <= new Date(endDate).getTime();
};

const _getDateKey = (isoString: string): string =>
  new Date(isoString).toISOString().split("T")[0];

const _getEntryMinutes = (entry: TimeEntry): number => {
  if (entry.duration) return entry.duration;
  if (entry.startTime && entry.endTime) {
    return Math.round(
      (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / 60000
    );
  }
  return 0;
};

const _collectItems = (items: Item[]): Item[] =>
  items.reduce<Item[]>((acc, item) => {
    acc.push(item);
    if (item.children) {
      acc.push(..._collectItems(item.children));
    }
    return acc;
  }, []);

const _aggregateForItem = (
  item: Item,
  startDate: string,
  endDate: string
): TempoData | null => {
  const matching = (item.timeEntries || []).filter((e) =>
    _isWithinRange(e.startTime, startDate, endDate)
  );

  if (matching.length === 0) return null;

  const entries = matching.reduce<
    Record<string, { totalMinutes: number; entries: TimeEntry[] }>
  >((acc, entry) => {
    const key = _getDateKey(entry.startTime);
    if (!acc[key]) {
      acc[key] = { totalMinutes: 0, entries: [] };
    }
    acc[key].totalMinutes += _getEntryMinutes(entry);
    acc[key].entries.push(entry);
    return acc;
  }, {});

  return { itemId: item.id, itemText: item.text, entries };
};

export const getTempoData = async (formData: FormData) => {
  try {
    const { uuid } = getFormData(formData, ["uuid"]);
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;

    if (!startDate || !endDate) return { error: "Start and end dates are required" };

    const [currentUser, list] = await Promise.all([
      getCurrentUser(),
      getListById(uuid),
    ]);

    if (!currentUser) return { error: "Not authenticated" };
    if (!list) return { error: "List not found" };

    const allItems = _collectItems(list.items);

    const data = allItems.reduce<TempoData[]>((acc, item) => {
      const result = _aggregateForItem(item, startDate, endDate);
      if (result) acc.push(result);
      return acc;
    }, []);

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching tempo data:", error);
    return { error: "Failed to fetch tempo data" };
  }
};
