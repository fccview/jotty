"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BrowsePage, BrowseQuery } from "@/app/_types";
import { BrowseScope, BrowseSort } from "@/app/_consts/browse";
import { fetchBrowsePage } from "@/app/_utils/ui-lookups";

interface UseServerBrowseOptions<T, F extends string> {
  scope: BrowseScope;
  initial: BrowsePage<T>;
  defaultFilter: F;
}

const _sameQuery = (a: BrowseQuery, b: BrowseQuery): boolean =>
  a.filter === b.filter &&
  a.recursive === b.recursive &&
  a.sort === b.sort &&
  a.perPage === b.perPage &&
  a.page === b.page &&
  a.categories.join("\n") === b.categories.join("\n");

export const useServerBrowse = <T, F extends string>({
  scope,
  initial,
  defaultFilter,
}: UseServerBrowseOptions<T, F>) => {
  const [filter, setFilterState] = useState<F>(initial.query.filter as F);
  const [categories, setCategories] = useState<string[]>(initial.query.categories);
  const [recursive, setRecursiveState] = useState(initial.query.recursive);
  const [sort, setSortState] = useState<BrowseSort>(initial.query.sort);
  const [perPage, setPerPageState] = useState(initial.query.perPage);
  const [page, setPage] = useState(initial.query.page);
  const [data, setData] = useState<BrowsePage<T>>(initial);
  const asked = useRef(0);

  const query: BrowseQuery = { filter, categories, recursive, sort, perPage, page };

  const resetting =
    <V>(set: (value: V) => void) =>
    (value: V) => {
      set(value);
      setPage(1);
    };

  const setFilter = useCallback(resetting(setFilterState), []);
  const setRecursive = useCallback(resetting(setRecursiveState), []);
  const setSort = useCallback(resetting(setSortState), []);
  const setPerPage = useCallback(resetting(setPerPageState), []);

  const wanted = JSON.stringify(query);
  useEffect(() => {
    if (_sameQuery(query, initial.query)) {
      ++asked.current;
      setData(initial);
      return;
    }
    const ticket = ++asked.current;
    fetchBrowsePage<T>(scope, query)
      .then((result) => {
        if (ticket !== asked.current) return;
        if (result.success && result.data) setData(result.data);
        else console.error(`Could not load ${scope}:`, result.error);
      })
      .catch((error) => console.error(`Could not load ${scope}:`, error));
  }, [wanted, scope, initial]);

  const toggleCategory = useCallback((path: string) => {
    setCategories((prev) => (prev.includes(path) ? prev.filter((entry) => entry !== path) : [...prev, path]));
    setPage(1);
  }, []);

  const clearCategories = useCallback(() => {
    setCategories([]);
    setPage(1);
  }, []);

  const clear = useCallback(() => {
    setFilterState(defaultFilter);
    setCategories([]);
    setSortState(BrowseSort.UPDATED);
    setPage(1);
  }, [defaultFilter]);

  const countFor = useCallback((candidate: F) => data.counts[candidate] ?? 0, [data.counts]);

  const pages = Math.max(1, Math.ceil(data.total / perPage));
  const current = Math.min(page, pages);
  const start = (current - 1) * perPage;

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
    total: data.total,
    start: data.total ? start + 1 : 0,
    end: Math.min(data.total, start + perPage),
    pageItems: data.pageItems,
    nextItems: data.nextItems,
    countFor,
    clear,
    size: data.size,
    pinned: data.pinned,
    kicker: data.kicker,
  };
};

export type BrowseControls<F extends string> = Omit<
  ReturnType<typeof useServerBrowse<unknown, F>>,
  "pageItems" | "nextItems"
> & { pageItems: unknown[]; nextItems: unknown[] };
