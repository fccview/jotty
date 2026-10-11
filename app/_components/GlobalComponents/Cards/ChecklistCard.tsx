"use client";

import { useMemo } from "react";
import { TimeQuarterIcon } from "hugeicons-react";
import { useTranslations } from "next-intl";
import { Checklist } from "@/app/_types";
import { isKanbanType } from "@/app/_types/enums";
import { formatRelativeTime, formatShortTime } from "@/app/_utils/date-utils";
import { countItems } from "@/app/_utils/checklist-utils";
import { boardAssignees, boardTrackedSeconds } from "@/app/_utils/kanban/board-utils";
import { cn } from "@/app/_utils/global-utils";
import { useTrackedTime } from "@/app/_hooks/useTrackedTime";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { AvatarStack } from "@/app/_components/GlobalComponents/User/AvatarStack";
import { PinToggle } from "./Parts/PinToggle";
import { ListKicker } from "./Parts/ListKicker";
import { TickGrid } from "./Parts/TickGrid";
import { NextUp } from "./Parts/NextUp";
import { MiniBoard } from "./Parts/MiniBoard";
import { Tally } from "./Parts/Tally";

const ASSIGNEE_LIMIT = 3;

interface ChecklistCardProps {
  list: Checklist;
  onSelect: (list: Checklist) => void;
  isPinned?: boolean;
  onTogglePin?: (list: Checklist) => void;
  compact?: boolean;
}

export const ChecklistCard = ({
  list,
  onSelect,
  isPinned = false,
  onTogglePin,
  compact = false,
}: ChecklistCardProps) => {
  const t = useTranslations();
  const trackedTime = useTrackedTime();
  const isBoard = isKanbanType(list.type);
  const { total, completed } = useMemo(
    () => countItems(list.items, list.type),
    [list.items, list.type],
  );
  const assignees = useMemo(
    () => (isBoard ? boardAssignees(list.items) : []),
    [isBoard, list.items],
  );
  const seconds = useMemo(
    () => (isBoard ? boardTrackedSeconds(list.items) : 0),
    [isBoard, list.items],
  );

  const updated = compact
    ? formatShortTime(list.updatedAt, t)
    : formatRelativeTime(list.updatedAt, t);

  return (
    <article
      className={cn(
        "jotty-checklist-card group flex flex-col bg-card border border-border rounded-jotty transition-colors duration-200 hover:border-primary/50 [overflow-wrap:anywhere]",
      )}
    >
      <div className={cn("flex items-start gap-2", compact ? "p-3 pb-2" : "p-4 pb-3")}>
        <div className="min-w-0 flex-1">
          <ListKicker list={list} />
          <button
            type="button"
            onClick={() => onSelect(list)}
                className={cn(
              "mt-1 block w-full truncate text-left font-semibold text-foreground group-hover:text-primary transition-colors",
              compact ? "text-sm" : "text-base",
            )}
          >
            {list.title}
          </button>
        </div>
        {onTogglePin && (
          <PinToggle
            isPinned={isPinned}
            onToggle={() => onTogglePin(list)}
            className="-mr-2 -mt-1 p-1"
          />
        )}
      </div>

      <div className={compact || isBoard ? "px-3" : "px-4"}>
        {isBoard ? (
          <MiniBoard board={list} compact={compact} />
        ) : (
          <TickGrid items={list.items} type={list.type} />
        )}
      </div>

      {!compact && !isBoard && (
        <div className="mt-3 px-4">
          <NextUp list={list} />
        </div>
      )}

      <div
        className={cn(
          "flex items-center justify-between gap-2 text-xs text-muted-foreground",
          compact
            ? "mt-2.5 px-3 pb-2.5"
            : cn(isBoard ? "mt-3" : "mt-4", "border-t border-dashed border-border px-4 py-3"),
        )}
      >
        {isBoard ? (
          <div className="flex min-w-0 items-center gap-3">
            <AvatarStack usernames={assignees} limit={ASSIGNEE_LIMIT} size="xs" />
            {seconds > 0 && !compact && (
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
              {list.sharedFrom && !compact
                ? t("common.sharedBy", { sharer: list.sharedFrom })
                : updated}
            </span>
          </span>
        )}
        <Tally done={completed} total={total} />
      </div>
    </article>
  );
};
