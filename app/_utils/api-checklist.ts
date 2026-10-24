import { Checklist } from "@/app/_types";
import { ChecklistsTypes, isKanbanType } from "@/app/_types/enums";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { ListView } from "@/app/_schemas/api/common";
import { toApiItem } from "@/app/_utils/api-item";

export const toApiChecklist = (list: Checklist, view: ListView = ListView.FULL) => ({
  id: list.uuid,
  title: list.title,
  category: list.category || UNCATEGORIZED,
  type: list.type || ChecklistsTypes.SIMPLE,
  owner: list.owner,
  isShared: list.isShared ?? false,
  ...(view === ListView.SUMMARY
    ? {
        itemCount: list.items.length,
        completedCount: list.items.filter((item) => item.completed).length,
      }
    : { items: list.items.map((item, index) => toApiItem(item, index, isKanbanType(list.type))) }),
  createdAt: list.createdAt,
  updatedAt: list.updatedAt,
});
