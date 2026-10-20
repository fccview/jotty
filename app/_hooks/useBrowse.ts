"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { BrowseSort, DEFAULT_ITEMS_PER_PAGE } from "@/app/_consts/browse";
import { isInCategory } from "@/app/_utils/category-path-utils";
import { newestFirst, oldestFirst } from "@/app/_utils/order-utils";

interface Browsable {
  title: string;
  category?: string;
  updatedAt: string;
}

const SORTERS: Record<BrowseSort, (a: Browsable, b: Browsable) => number> = {
  [BrowseSort.UPDATED]: newestFirst,
  [BrowseSort.OLDEST]: oldestFirst,
  [BrowseSort.AZ]: (a, b) => a.title.localeCompare(b.title),
};

interface UseBrowseOptions<T, F extends string> {
  items: T[];
  defaultFilter: F;
  matches: (item: T, filter: F) => boolean;
  limitFor?: (filter: F) => number | undefined;
}

export const useBrowse = <T extends Browsable, F extends string>({
  items,
  defaultFilter,
  matches,
  limitFor,
}: UseBrowseOptions<T, F>) => {
  const [filter, setFilter] = useState<F>(defaultFilter);
  const [categories, setCategories] = useState<string[]>([]);
  const [recursive, setRecursive] = useState(false);
  const [sort, setSort] = useState<BrowseSort>(BrowseSort.UPDATED);
  const [perPage, setPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [filter, categories, recursive, sort, perPage]);

  const inCategories = useMemo(
    () =>
      categories.length
        ? items.filter((item) =>
            categories.some((path) =>
              isInCategory(item.category || UNCATEGORIZED, path, recursive),
            ),
          )
        : items,
    [items, categories, recursive],
  );

  const matching = useCallback(
    (candidate: F) => inCategories.filter((item) => matches(item, candidate)),
    [inCategories, matches],
  );

  const capped = useCallback(
    (candidate: F, count: number) => {
      const limit = limitFor?.(candidate);
      return limit ? Math.min(count, limit) : count;
    },
    [limitFor],
  );

  const results = useMemo(() => {
    const found = matching(filter).sort(SORTERS[sort]);
    return found.slice(0, capped(filter, found.length));
  }, [matching, filter, sort, capped]);

  const countFor = useCallback(
    (candidate: F) => capped(candidate, matching(candidate).length),
    [matching, capped],
  );

  const pages = Math.max(1, Math.ceil(results.length / perPage));
  const current = Math.min(page, pages);
  const start = (current - 1) * perPage;

  const toggleCategory = useCallback(
    (path: string) =>
      setCategories((prev) =>
        prev.includes(path) ? prev.filter((entry) => entry !== path) : [...prev, path],
      ),
    [],
  );

  const clearCategories = useCallback(() => setCategories([]), []);

  const clear = useCallback(() => {
    setFilter(defaultFilter);
    setCategories([]);
    setSort(BrowseSort.UPDATED);
  }, [defaultFilter]);

  return {
    filter,
    setFilter,
    categories,
    toggleCategory,
    clearCategories,
    recursive,
    setRecursive,
    sort,
    setSort,
    perPage,
    setPerPage,
    page: current,
    setPage,
    pages,
    total: results.length,
    start: results.length ? start + 1 : 0,
    end: Math.min(results.length, start + perPage),
    pageItems: results.slice(start, start + perPage),
    countFor,
    clear,
  };
};

export type BrowseControls<F extends string> = Omit<
  ReturnType<typeof useBrowse<Browsable, F>>,
  "pageItems"
> & { pageItems: unknown[] };
