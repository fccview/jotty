import { Item } from "@/app/_types";

const _findItem = (items: Item[], itemId: string): Item | null => {
  for (const item of items) {
    if (item.id === itemId) return item;
    if (item.children) {
      const found = _findItem(item.children, itemId);
      if (found) return found;
    }
  }
  return null;
};

const _updateItem = (items: Item[], itemId: string, updater: (item: Item) => Item): Item[] =>
  items.map((item) => {
    if (item.id === itemId) return updater(item);
    if (item.children) {
      return { ...item, children: _updateItem(item.children, itemId, updater) };
    }
    return item;
  });

const _updateAllChildren = (
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
      ? _updateAllChildren(item.children, completed, username, now)
      : undefined,
  }));

const _filterItems = (items: Item[], predicate: (item: Item) => boolean): Item[] =>
  items
    .filter(predicate)
    .map((item) => ({
      ...item,
      children: item.children
        ? _filterItems(item.children, predicate)
        : undefined,
    }));

export { _findItem, _updateItem, _updateAllChildren, _filterItems };
