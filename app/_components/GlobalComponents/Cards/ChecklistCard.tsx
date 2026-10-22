"use client";

import { TimeQuarterIcon } from "hugeicons-react";
import { useTranslations } from "next-intl";
import { Checklist } from "@/app/_types";
import { formatRelativeTime } from "@/app/_utils/date-utils";
import { cn } from "@/app/_utils/global-utils";
import { useTrackedTime } from "@/app/_hooks/useTrackedTime";
import { useListCardStats } from "@/app/_hooks/useListCardStats";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { AvatarStack } from "@/app/_components/GlobalComponents/User/AvatarStack";
import { ListCardHead } from "./Parts/ListCardHead";
import { TickGrid } from "./Parts/TickGrid";
import { NextUp } from "./Parts/NextUp";
import { MiniBoard } from "./Parts/MiniBoard";
import { Tally } from "./Parts/Tally";
import { useCardClick } from "@/app/_hooks/useCardClick";

export const ASSIGNEE_LIMIT = 3;

interface ChecklistCardProps {
  list: Checklist;
  onSelect: (list: Checklist) => void;
  isPinned?: boolean;
  onTogglePin?: (list: Checklist) => void;
}

export const ChecklistCard = ({
  list,
  onSelect,
  isPinned = false,
  onTogglePin,
}: ChecklistCardProps) => {
  const t = useTranslations();
  const trackedTime = useTrackedTime();
  const { isBoard, total, completed, assignees, seconds, summary } = useListCardStats(list);
  const updated = formatRelativeTime(list.updatedAt, t);
  const handleClick = useCardClick(list, onSelect);

  return (
    <article
      onClick={handleClick}
      className="jotty-checklist-card group cursor-pointer flex flex-col bg-card border border-border rounded-jotty transition-colors duration-200 hover:border-primary/50 [overflow-wrap:anywhere]">
      <ListCardHead
        list={list}
        onSelect={onSelect}
        isPinned={isPinned}
        onTogglePin={onTogglePin}
        className="p-4 pb-3"
        titleClassName="text-base"
      />

      <div className={isBoard ? "px-3" : "px-4"}>
        {isBoard ? (
          <MiniBoard summary={summary} />
        ) : (
          <TickGrid summary={summary} />
        )}
      </div>

      {!isBoard && (
        <div className="mt-3 px-4">
          <NextUp uuid={list.uuid} summary={summary} />
        </div>
      )}

      <div
        className={cn(
          "flex items-center justify-between gap-2 text-xs text-muted-foreground",
          isBoard ? "mt-3" : "mt-4",
          "border-t border-dashed border-border px-4 py-3",
        )}
      >
        {isBoard ? (
          <div className="flex min-w-0 items-center gap-3">
            <AvatarStack usernames={assignees} limit={ASSIGNEE_LIMIT} size="xs" />
            {seconds > 0 && (
              <span className="inline-flex items-center gap-1">
                <TimeQuarterIcon className="h-3 w-3 text-purple-500" />
                <span className="font-medium text-purple-600 whitespace-nowrap">
                  {trackedTime(seconds)}
                </span>
              </span>
            )}
            <span className="truncate">{updated}</span>
          </div>
        ) : (
          <span className="flex min-w-0 items-center gap-1.5">
            {list.sharedFrom && <UserAvatar username={list.sharedFrom} size="xs" />}
            <span className="truncate">
              {list.sharedFrom ? t("common.sharedBy", { sharer: list.sharedFrom }) : updated}
            </span>
          </span>
        )}
        <Tally done={completed} total={total} />
      </div>
    </article>
  );
};
