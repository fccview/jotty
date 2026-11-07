"use client";

import { useTranslations } from "next-intl";
import { Notification03Icon } from "hugeicons-react";
import { Checklist, Item } from "@/app/_types";
import { KanbanPriorityLevel } from "@/app/_types/enums";
import { cn } from "@/app/_utils/global-utils";
import { getPriorityDotColor, getPriorityLabel, shownPriority } from "@/app/_utils/kanban";
import { formatReminderTime } from "@/app/_utils/kanban/reminder-utils";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { AgentChip } from "./AgentChip";

const CHIP = "text-[10px] font-medium px-1.5 py-0.5 rounded-jotty";
const MUTED_CHIP = `${CHIP} bg-muted text-muted-foreground`;

interface KanbanCardChipsProps {
  item: Item;
  checklist: Pick<Checklist, "uuid" | "specNote">;
  avatarFor?: (username: string) => string;
}

export const KanbanCardChips = ({ item, checklist, avatarFor }: KanbanCardChipsProps) => {
  const t = useTranslations();
  const priority = shownPriority(item.priority);

  return (
    <div className="flex flex-wrap gap-1.5">
      {priority && (
        <span
          className={cn(
            CHIP,
            "flex items-center gap-1",
            priority === KanbanPriorityLevel.CRITICAL && "bg-destructive/10 text-destructive",
            priority === KanbanPriorityLevel.HIGH && "bg-warning/10 text-warning",
            priority !== KanbanPriorityLevel.CRITICAL &&
              priority !== KanbanPriorityLevel.HIGH &&
              "bg-muted text-muted-foreground",
          )}
        >
          <span
            className="w-2 h-2 rounded-jotty flex-shrink-0"
            style={{ backgroundColor: getPriorityDotColor(priority) }}
          />
          {getPriorityLabel(priority, t)}
        </span>
      )}

      {item.score !== undefined && (
        <span className={MUTED_CHIP}>{t("kanban.scoreLabel", { score: item.score })}</span>
      )}

      {item.reminder && !item.reminder.notified && (
        <span className={cn(MUTED_CHIP, "flex items-center gap-0.5")}>
          <span className="w-4 h-4 rounded-full bg-warning flex items-center justify-center">
            <Notification03Icon className="h-2 w-2 text-white" />
          </span>
          {formatReminderTime(item.reminder.datetime)}
        </span>
      )}

      {item.assignee && (
        <span className={cn(MUTED_CHIP, "flex items-center gap-0.5")}>
          <UserAvatar username={item.assignee} size="xs" avatarUrl={avatarFor?.(item.assignee) || ""} />
          {item.assignee}
        </span>
      )}

      {item.agent && <AgentChip agentId={item.agent} checklist={checklist} className={MUTED_CHIP} />}
    </div>
  );
};
