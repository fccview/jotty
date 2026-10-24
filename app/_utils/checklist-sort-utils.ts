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

const _byText = (direction: SortDirection, locale: string) => {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  const sign = direction === SortDirection.DESC ? -1 : 1;
  return (a: Item, b: Item): number => sign * collator.compare(a.text, b.text);
};

const _stampOf = (item: Item, sort: ItemSort): number => {
  const stamp = sort === ItemSort.MODIFIED ? item.lastModifiedAt || item.createdAt : item.createdAt;
  return stamp ? Date.parse(stamp) : NaN;
};

const _byStamp = (sort: ItemSort, direction: SortDirection) => {
  const sign = direction === SortDirection.DESC ? -1 : 1;
  return (a: Item, b: Item): number => {
    const [first, second] = [_stampOf(a, sort), _stampOf(b, sort)];
    if (Number.isNaN(first) || Number.isNaN(second)) {
      return Number(Number.isNaN(first)) - Number(Number.isNaN(second));
    }
    return sign * (first - second);
  };
};

const _comparer = (sort: ItemSort, direction: SortDirection, locale: string) =>
  sort === ItemSort.ALPHABETICAL ? _byText(direction, locale) : _byStamp(sort, direction);

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

const _arrangeTree = (items: Item[], arrange: (group: Item[]) => Item[]): Item[] =>
  arrange(items).map((item, order) => ({
    ...item,
    order,
    ...(item.children && { children: _arrangeTree(item.children, arrange) }),
  }));

export const sortTree = (
  items: Item[],
  sort: ItemSort,
  direction: SortDirection = SortDirection.ASC,
  locale: string = FALLBACK_SORT_LOCALE,
): Item[] => {
  if (sort === ItemSort.SHUFFLE) return _arrangeTree(items, shuffle);
  const compare = _comparer(sort, direction, locale);
  return _arrangeTree(items, (group) => [...group].sort(compare));
};

export const preorderIds = (items: Item[]): string[] =>
  items.flatMap((item) => [item.id, ...preorderIds(item.children || [])]);

export const sameOrder = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((id, index) => id === b[index]);

export const restoreTree = (items: Item[], ids: string[]): Item[] => {
  const ranks = new Map(ids.map((id, rank) => [id, rank]));
  const rankOf = (item: Item) => ranks.get(item.id) ?? UNRANKED;
  return _arrangeTree(items, (group) => [...group].sort((a, b) => rankOf(a) - rankOf(b)));
};
