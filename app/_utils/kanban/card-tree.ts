import { Item, KanbanStatus } from "@/app/_types";
import { TaskStatus } from "@/app/_types/enums";

export interface CardSpot {
  item: Item;
  parentId?: string;
}

export const flatCards = (items: Item[], parentId?: string): CardSpot[] =>
  items.flatMap((item) => [
    { item, ...(parentId && { parentId }) },
    ...flatCards(item.children || [], item.id),
  ]);

export const cardStatus = (item: Item): string => item.status || TaskStatus.TODO;

export const isCardDone = (item: Item): boolean =>
  !!item.completed || item.status === TaskStatus.COMPLETED;

export const statusLabel = (statuses: KanbanStatus[], id: string): string =>
  statuses.find((status) => status.id === id)?.label ?? id;

export const plainDescription = (text: string): string => text.replace(/\\n/g, "\n");
