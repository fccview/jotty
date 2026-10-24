import { Checklist, Item } from "@/app/_types";
import { ItemSort, SortDirection } from "@/app/_types/enums";

export interface SortedList {
  list: Checklist;
  before: string[];
  changed: boolean;
}

export const FALLBACK_SORT_LOCALE = "en";

const UNRANKED = Number.MAX_SAFE_INTEGER;

const _supported = (locale: string): string | undefined => {
  try {
    return Intl.Collator.supportedLocalesOf(locale)[0];
  } catch (error) {
    console.warn(`Sorting in ${FALLBACK_SORT_LOCALE}, "${locale}" is not a locale:`, error);
    return undefined;
  }
};

export const sortLocale = (preferred?: string): string =>
  (preferred && _supported(preferred)) || FALLBACK_SORT_LOCALE;

type Arrange = (group: Item[]) => Item[];

const _byText = (locale: string, direction?: SortDirection): Arrange => {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  const sign = direction === SortDirection.DESC ? -1 : 1;
  return (group) => [...group].sort((a, b) => sign * collator.compare(a.text, b.text));
};

const _stampOf = (item: Item, sort: ItemSort): number => {
  const stamp = sort === ItemSort.MODIFIED ? item.lastModifiedAt || item.createdAt : item.createdAt;
  return stamp ? Date.parse(stamp) : NaN;
};

const _byStamp = (sort: ItemSort, direction?: SortDirection): Arrange => {
  const sign = direction === SortDirection.DESC ? -1 : 1;
  return (group) =>
    group
      .map((item) => ({ item, stamp: _stampOf(item, sort) }))
      .sort((a, b) => {
        if (Number.isNaN(a.stamp) || Number.isNaN(b.stamp)) {
          return Number(Number.isNaN(a.stamp)) - Number(Number.isNaN(b.stamp));
        }
        return sign * (a.stamp - b.stamp);
      })
      .map(({ item }) => item);
};

const _permutation = (size: number): number[] => {
  const order = Array.from({ length: size }, (_, index) => index);
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
};

const _isIdentity = (order: number[]): boolean =>
  order.every((position, index) => position === index);

export const shuffle = <T>(items: T[]): T[] => {
  if (items.length < 2) return [...items];
  let order = _permutation(items.length);
  while (_isIdentity(order)) order = _permutation(items.length);
  return order.map((index) => items[index]);
};

const _arrangeTree = (items: Item[], arrange: Arrange): Item[] =>
  arrange(items).map((item, order) => ({
    ...item,
    order,
    ...(item.children && { children: _arrangeTree(item.children, arrange) }),
  }));

const _arranger = (sort: ItemSort, locale: string, direction?: SortDirection): Arrange => {
  if (sort === ItemSort.SHUFFLE) return shuffle;
  return sort === ItemSort.ALPHABETICAL ? _byText(locale, direction) : _byStamp(sort, direction);
};

export const numberTree = (items: Item[]): Item[] => _arrangeTree(items, (group) => [...group]);

export const sortTree = (
  items: Item[],
  sort: ItemSort,
  direction?: SortDirection,
  locale: string = FALLBACK_SORT_LOCALE,
): Item[] => _arrangeTree(items, _arranger(sort, locale, direction));

export const preorderIds = (items: Item[]): string[] =>
  items.flatMap((item) => [item.id, ...preorderIds(item.children || [])]);

export const treeShape = (items: Item[], depth = 0): string[] =>
  items.flatMap((item) => [`${depth}:${item.id}`, ...treeShape(item.children || [], depth + 1)]);

export const sameOrder = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((id, index) => id === b[index]);

export const restoreTree = (items: Item[], ids: string[]): Item[] => {
  const ranks = new Map(ids.map((id, rank) => [id, rank]));
  const rankOf = (item: Item) => ranks.get(item.id) ?? UNRANKED;
  return _arrangeTree(items, (group) => [...group].sort((a, b) => rankOf(a) - rankOf(b)));
};
