"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { FILTER_PAGE_SIZE } from "@/app/_consts/files";
import { useInfiniteScroll } from "@/app/_hooks/useInfiniteScroll";
import { ContentFilter } from "@/app/_types";

interface FeedPage {
  success: boolean;
  data?: unknown;
}

export const useFilteredFeed = <T>(
  filter: ContentFilter | null,
  load: (filter: ContentFilter, limit: number, offset: number) => Promise<FeedPage>,
) => {
  const [isPending, startTransition] = useTransition();
  const [firstPage, setFirstPage] = useState<T[]>([]);

  useEffect(() => {
    let isStale = false;
    setFirstPage([]);
    if (!filter) return;

    startTransition(async () => {
      const result = await load(filter, FILTER_PAGE_SIZE, 0);
      if (!isStale && result.success && Array.isArray(result.data)) {
        setFirstPage(result.data as T[]);
      }
    });

    return () => {
      isStale = true;
    };
  }, [filter, load]);

  const fetchPage = useCallback(
    (offset: number) =>
      filter
        ? load(filter, FILTER_PAGE_SIZE, offset).then((result) => ({
            data: (result.success && Array.isArray(result.data) ? result.data : []) as T[],
          }))
        : Promise.resolve({ data: [] as T[] }),
    [filter, load],
  );

  const feed = useInfiniteScroll({
    initialItems: firstPage,
    fetchPage,
    pageSize: FILTER_PAGE_SIZE,
    resetKey: filter ? `${filter.type}-${filter.value}` : null,
  });

  return {
    items: feed.items,
    sentinelRef: feed.sentinelRef,
    isLoadingMore: feed.isLoading,
    hasMore: feed.hasMore,
    isLoadingFirst: Boolean(filter) && isPending && firstPage.length === 0,
  };
};
