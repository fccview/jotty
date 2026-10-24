import type { ItemType } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { fetchItems } from "@/app/_utils/ui-lookups";

export const MENTION_LIMIT = 50;
export const MENTION_SEARCH_DEBOUNCE_MS = 150;

export interface Mentionable {
  title: string;
  type: ItemType;
  category: string;
  id: string;
  uuid?: string;
}

export const findMentionables = async (query: string): Promise<Mentionable[]> => {
  try {
    const result = await fetchItems(query, MENTION_LIMIT, true);
    if (!result.success || !result.data) {
      console.error("Could not find items to mention:", result.error);
      return [];
    }
    return [
      ...result.data.notes.map((note) => ({ ...note, type: ItemTypes.NOTE as const })),
      ...result.data.checklists.map((checklist) => ({ ...checklist, type: ItemTypes.CHECKLIST as const })),
    ] as Mentionable[];
  } catch (error) {
    console.error("Could not find items to mention:", error);
    return [];
  }
};
