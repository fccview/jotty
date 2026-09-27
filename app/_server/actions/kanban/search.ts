"use server";

import { Item, KanbanPriority } from "@/app/_types";
import { sessionActor } from "@/app/_server/actions/lib/actor";
import { viewList } from "@/app/_server/actions/checklist/viewer";
import { getFormData } from "@/app/_utils/global-utils";

const _matchesText = (item: Item, query: string): boolean => {
  const lower = query.toLowerCase();
  return (
    item.text.toLowerCase().includes(lower) ||
    (item.description?.toLowerCase().includes(lower) ?? false)
  );
};

const _matchesPriority = (item: Item, priority: KanbanPriority): boolean =>
  item.priority === priority;

const _matchesAssignee = (item: Item, assignee: string): boolean =>
  item.assignee === assignee;

const _filterItems = (
  items: Item[],
  query?: string,
  priority?: KanbanPriority,
  assignee?: string
): Item[] =>
  items.reduce<Item[]>((acc, item) => {
    const childMatches = item.children
      ? _filterItems(item.children, query, priority, assignee)
      : [];

    const selfMatches =
      (!query || _matchesText(item, query)) &&
      (!priority || _matchesPriority(item, priority)) &&
      (!assignee || _matchesAssignee(item, assignee));

    if (selfMatches || childMatches.length > 0) {
      acc.push({
        ...item,
        children: selfMatches ? item.children : childMatches,
      });
    }

    return acc;
  }, []);

export const searchKanbanItems = async (formData: FormData) => {
  try {
    const { uuid } = getFormData(formData, ["uuid"]);
    const query = formData.get("query") as string | null;
    const priority = formData.get("priority") as KanbanPriority | null;
    const assignee = formData.get("assignee") as string | null;

    const actor = await sessionActor();
    if ("error" in actor) return { error: actor.error };

    const list = await viewList(uuid);
    if (!list) return { error: "List not found" };

    const filtered = _filterItems(
      list.items,
      query || undefined,
      priority || undefined,
      assignee || undefined,
    );

    return { success: true, data: filtered };
  } catch (error) {
    console.error("Error searching kanban items:", error);
    return { error: "Failed to search items" };
  }
};
