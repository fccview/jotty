"use client";

import { JottyIcon } from "@/app/_components/GlobalComponents/Layout/CustomIcons/JottyIcon";
import { HomeFeed } from "@/app/_hooks/useHomeFeed";

type FeedStatus = Pick<HomeFeed, "filter" | "hasMore" | "isLoadingMore" | "isLoadingFirst" | "sentinelRef">;

export const FeedLoading = ({ feed }: { feed: FeedStatus }) =>
  feed.isLoadingFirst ? (
    <div className="flex items-center justify-center min-h-[240px]">
      <JottyIcon className="h-16 w-16 text-primary" animated={true} />
    </div>
  ) : null;

export const FeedTail = ({ feed }: { feed: FeedStatus }) => (
  <>
    {feed.filter && feed.hasMore && (
      <div ref={feed.sentinelRef} className="h-4 min-h-4" aria-hidden />
    )}
    {feed.filter && feed.isLoadingMore && (
      <div className="py-4 flex justify-center">
        <JottyIcon className="h-10 w-10 text-primary" animated={true} />
      </div>
    )}
  </>
);
