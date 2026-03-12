import { Item } from "@/app/_types";

export const findItem = (items: Item[], itemId: string): Item | null => {
  for (const item of items) {
    if (item.id === itemId) return item;
    if (item.children) {
      const found = findItem(item.children, itemId);
      if (found) return found;
    }
  }
  return null;
};

export const updateItem = (items: Item[], itemId: string, updater: (item: Item) => Item): Item[] =>
  items.map((item) => {
    if (item.id === itemId) return updater(item);
    if (item.children) {
      return { ...item, children: updateItem(item.children, itemId, updater) };
    }
    return item;
  });

export const updateAllChildren = (
  items: Item[],
  completed: boolean,
  username?: string,
  now?: string
): Item[] =>
  items.map((item) => ({
    ...item,
    completed,
    ...(username && { lastModifiedBy: username }),
    ...(now && { lastModifiedAt: now }),
    children: item.children
      ? updateAllChildren(item.children, completed, username, now)
      : undefined,
  }));

export const filterItems = (items: Item[], predicate: (item: Item) => boolean): Item[] =>
  items
    .filter(predicate)
    .map((item) => ({
      ...item,
      children: item.children
        ? filterItems(item.children, predicate)
        : undefined,
    }));
