"use client";

import { ContentFilter } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useFilteredFeed } from "@/app/_hooks/useFilteredFeed";

interface FeedPage {
  success: boolean;
  data?: unknown;
}

export const useHomeFeed = <T>(
  load: (filter: ContentFilter, limit: number, offset: number) => Promise<FeedPage>,
) => {
  const { selectedFilter } = useAppMode();
  const feed = useFilteredFeed<T>(selectedFilter, load);

  return { ...feed, filter: selectedFilter };
};

export type HomeFeed = ReturnType<typeof useHomeFeed>;
