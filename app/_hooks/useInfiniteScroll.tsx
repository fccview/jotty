"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseInfiniteScrollProps<T> {
  initialItems: T[];
  fetchPage: (offset: number) => Promise<{ data: T[] }>;
  pageSize: number;
  resetKey?: string | null;
}

export function useInfiniteScroll<T>({
  initialItems,
  fetchPage,
  pageSize,
  resetKey,
}: UseInfiniteScrollProps<T>) {
  const [extraItems, setExtraItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const lastFetchedOffsetRef = useRef<number>(-1);
  const fetchPageRef = useRef(fetchPage);
  const nextOffsetRef = useRef(0);
  fetchPageRef.current = fetchPage;
  nextOffsetRef.current = initialItems.length + extraItems.length;

  useEffect(() => {
    setExtraItems([]);
    setHasMore(true);
    lastFetchedOffsetRef.current = -1;
  }, [resetKey]);

  useEffect(() => {
    if (!hasMore || isLoading || pageSize <= 0) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    nextOffsetRef.current = initialItems.length + extraItems.length;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;

        const offset = nextOffsetRef.current;
        if (offset === 0 || offset === lastFetchedOffsetRef.current) return;
        lastFetchedOffsetRef.current = offset;

        setIsLoading(true);
        fetchPageRef.current(offset)
          .then(({ data }) => {
            setExtraItems((prev) => [...prev, ...data]);
            setHasMore(data.length >= pageSize);
          })
          .finally(() => {
            setIsLoading(false);
          });
      },
      { rootMargin: "200px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [initialItems.length, extraItems.length, pageSize, hasMore, isLoading]);

  const items = [...initialItems, ...extraItems];

  return { items, sentinelRef, isLoading, hasMore };
}

interface UseWindowedListProps<T> {
  items: T[];
  pageSize: number;
  resetKey?: string | null;
}

export function useWindowedList<T>({
  items,
  pageSize,
  resetKey,
}: UseWindowedListProps<T>) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [resetKey, pageSize]);

  useEffect(() => {
    if (visibleCount >= items.length) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        setVisibleCount((prev) => Math.min(prev + pageSize, items.length));
      },
      { rootMargin: "200px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length, visibleCount, pageSize]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return { visibleItems, sentinelRef, hasMore };
}
