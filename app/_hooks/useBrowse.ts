"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowseSort, DEFAULT_ITEMS_PER_PAGE } from "@/app/_consts/browse";
import { Browsable, browseResults, inCategories } from "@/app/_utils/browse-utils";

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

  const scoped = useMemo(
    () => inCategories(items, categories, recursive),
    [items, categories, recursive],
  );

  const matching = useCallback(
    (candidate: F) => scoped.filter((item) => matches(item, candidate)),
    [scoped, matches],
  );

  const capped = useCallback(
    (candidate: F, count: number) => {
      const limit = limitFor?.(candidate);
      return limit ? Math.min(count, limit) : count;
    },
    [limitFor],
  );

  const results = useMemo(
    () => browseResults(scoped, filter, sort, matches, limitFor),
    [scoped, filter, sort, matches, limitFor],
  );

  const countFor = useCallback(
    (candidate: F) => capped(candidate, matching(candidate).length),
    [matching, capped],
  );

  const pages = Math.max(1, Math.ceil(results.length / perPage));
  const current = Math.min(page, pages);
  const start = (current - 1) * perPage;
  const pageItems = useMemo(() => results.slice(start, start + perPage), [results, start, perPage]);
  const nextItems = useMemo(
    () => results.slice(start + perPage, start + perPage * 2),
    [results, start, perPage],
  );

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
    pageItems,
    nextItems,
    countFor,
    clear,
  };
};

export type BrowseControls<F extends string> = Omit<
  ReturnType<typeof useBrowse<Browsable, F>>,
  "pageItems" | "nextItems"
> & { pageItems: unknown[]; nextItems: unknown[] };
