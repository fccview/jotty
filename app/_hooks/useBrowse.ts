"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { BrowseSort, DEFAULT_ITEMS_PER_PAGE } from "@/app/_consts/browse";
import { isInCategory } from "@/app/_utils/category-path-utils";

interface Browsable {
  title: string;
  category?: string;
  updatedAt: string;
}

const SORTERS: Record<BrowseSort, (a: Browsable, b: Browsable) => number> = {
  [BrowseSort.UPDATED]: (a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  [BrowseSort.OLDEST]: (a, b) =>
    new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
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

  const resultsFor = useCallback(
    (candidate: F) => {
      const found = items
        .filter((item) => matches(item, candidate))
        .filter(
          (item) =>
            !categories.length ||
            categories.some((path) =>
              isInCategory(item.category || UNCATEGORIZED, path, recursive),
            ),
        )
        .sort(SORTERS[sort]);
      const limit = limitFor?.(candidate);
      return limit ? found.slice(0, limit) : found;
    },
    [items, matches, categories, recursive, sort, limitFor],
  );

  const results = useMemo(() => resultsFor(filter), [resultsFor, filter]);
  const pages = Math.max(1, Math.ceil(results.length / perPage));
  const current = Math.min(page, pages);
  const start = (current - 1) * perPage;

  const toggleCategory = (path: string) =>
    setCategories((prev) =>
      prev.includes(path) ? prev.filter((entry) => entry !== path) : [...prev, path],
    );

  const clear = () => {
    setFilter(defaultFilter);
    setCategories([]);
    setSort(BrowseSort.UPDATED);
  };

  return {
    filter,
    setFilter,
    categories,
    toggleCategory,
    clearCategories: () => setCategories([]),
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
    countFor: (candidate: F) => resultsFor(candidate).length,
    isDefault: filter === defaultFilter && !categories.length && sort === BrowseSort.UPDATED,
    clear,
  };
};
