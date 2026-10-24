import { EXCLUDED_DIRS, RESERVED_DIRS } from "@/app/_consts/files";

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

export const isReservedCategory = (category = ""): boolean =>
  category.split(SEPARATOR).some((part, index) => {
    const name = part.trim().toLowerCase();
    return index === 0 ? EXCLUDED_DIRS.includes(name) : RESERVED_DIRS.includes(name);
  });
