const SEPARATOR = "/";
const TRAIL_SEPARATOR = " / ";

export const categoryLeaf = (path: string | undefined, fallback: string): string =>
  path ? path.split(SEPARATOR).pop() || path : fallback;

export const categoryTrail = (path: string | undefined, fallback: string): string =>
  path ? path.split(SEPARATOR).join(TRAIL_SEPARATOR) : fallback;

export const isInCategory = (
  itemCategory: string,
  selected: string,
  recursive: boolean,
): boolean =>
  itemCategory === selected ||
  (recursive && itemCategory.startsWith(selected + SEPARATOR));
