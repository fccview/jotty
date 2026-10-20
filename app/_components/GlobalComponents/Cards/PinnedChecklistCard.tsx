"use client";

import { useTranslations } from "next-intl";
import { Checklist } from "@/app/_types";
import { formatShortTime } from "@/app/_utils/date-utils";
import { useListCardStats } from "@/app/_hooks/useListCardStats";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { AvatarStack } from "@/app/_components/GlobalComponents/User/AvatarStack";
import { ASSIGNEE_LIMIT } from "./ChecklistCard";
import { ListCardHead } from "./Parts/ListCardHead";
import { TickGrid } from "./Parts/TickGrid";
import { MiniBoard } from "./Parts/MiniBoard";
import { Tally } from "./Parts/Tally";

interface PinnedChecklistCardProps {
  list: Checklist;
  onSelect: (list: Checklist) => void;
  onTogglePin?: (list: Checklist) => void;
}

export const PinnedChecklistCard = ({ list, onSelect, onTogglePin }: PinnedChecklistCardProps) => {
  const t = useTranslations();
  const { isBoard, total, completed, assignees } = useListCardStats(list);
  const updated = formatShortTime(list.updatedAt, t);

  return (
    <article className="jotty-checklist-card group flex flex-col bg-card border border-border rounded-jotty transition-colors duration-200 hover:border-primary/50 [overflow-wrap:anywhere]">
      <ListCardHead
        list={list}
        onSelect={onSelect}
        isPinned
        onTogglePin={onTogglePin}
        className="p-3 pb-2"
        titleClassName="text-sm"
      />

      <div className="px-3">
        {isBoard ? (
          <MiniBoard board={list} compact />
        ) : (
          <TickGrid items={list.items} type={list.type} />
        )}
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mt-2.5 px-3 pb-2.5">
        {isBoard ? (
          <div className="flex min-w-0 items-center gap-3">
            <AvatarStack usernames={assignees} limit={ASSIGNEE_LIMIT} size="xs" />
            <span className="truncate">{updated}</span>
          </div>
        ) : (
          <span className="flex min-w-0 items-center gap-1.5">
            {list.sharedFrom && <UserAvatar username={list.sharedFrom} size="xs" />}
            <span className="truncate">{updated}</span>
          </span>
        )}
        <Tally done={completed} total={total} />
      </div>
    </article>
  );
};
