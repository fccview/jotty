"use client";

import { useTranslations } from "next-intl";
import { Checklist, Item, KanbanStatus } from "@/app/_types";
import { KanbanPriorityLevel } from "@/app/_types/enums";
import { TASK_STATUS_CONFIG } from "@/app/_consts/checklists";
import { boardColumns } from "@/app/_utils/kanban/board-utils";
import { toDateKey } from "@/app/_utils/kanban/calendar-utils";
import { getPriorityDotColor, getPriorityLabel } from "@/app/_utils/kanban";
import { useShowEmojis } from "@/app/_hooks/useShowEmojis";
import { useEmojiCache } from "@/app/_hooks/useEmojiCache";
import { usePreferredDateTime } from "@/app/_hooks/usePreferredDateTime";
import { ChecklistItemText } from "@/app/_components/FeatureComponents/Checklists/Parts/Common/ChecklistItemText";

const LOCAL_MIDNIGHT = "T00:00:00";
const KNOWN_PRIORITIES = Object.values(KanbanPriorityLevel) as string[];

const _shownPriority = (item: Item) =>
  item.priority && item.priority !== KanbanPriorityLevel.NONE && KNOWN_PRIORITIES.includes(item.priority)
    ? item.priority
    : null;

const StatusMark = ({ status }: { status: KanbanStatus }) => {
  const config = TASK_STATUS_CONFIG[status.id as keyof typeof TASK_STATUS_CONFIG];
  if (config && !status.color) return <config.Icon className={`h-4 w-4 flex-none ${config.iconClassName}`} />;

  return (
    <span
      className="h-2.5 w-2.5 flex-none rounded-full bg-muted-foreground"
      style={status.color ? { backgroundColor: status.color } : undefined}
    />
  );
};

const BoardCard = ({ item, ownerShowsEmojis }: { item: Item; ownerShowsEmojis: boolean }) => {
  const t = useTranslations();
  const { formatDateString } = usePreferredDateTime();
  const showEmojis = useShowEmojis(ownerShowsEmojis);
  const emoji = useEmojiCache(item.text, showEmojis);
  const priority = _shownPriority(item);
  const subtasks = item.children || [];
  const doneSubtasks = subtasks.filter((child) => child.completed).length;

  return (
    <li className="rounded-jotty border border-border bg-card p-3 text-md lg:text-sm">
      {showEmojis && emoji && <span className="mr-2">{emoji}</span>}
      <ChecklistItemText text={item.text} />
      {(priority || item.targetDate || subtasks.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-md text-muted-foreground lg:text-xs">
          {priority && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getPriorityDotColor(priority) }} />
              {getPriorityLabel(priority, t)}
            </span>
          )}
          {item.targetDate && <span>{formatDateString(`${toDateKey(item.targetDate)}${LOCAL_MIDNIGHT}`)}</span>}
          {subtasks.length > 0 && (
            <span className="font-mono tabular-nums">
              {doneSubtasks}/{subtasks.length}
            </span>
          )}
        </div>
      )}
    </li>
  );
};

interface PublicBoardProps {
  checklist: Checklist;
  ownerShowsEmojis: boolean;
}

export const PublicBoard = ({ checklist, ownerShowsEmojis }: PublicBoardProps) => (
  <div className="-mx-5 overflow-x-auto px-5 pb-2 lg:-mx-6 lg:px-6">
    <div className="flex items-start gap-3">
      {boardColumns(checklist).map(({ status, items }) => (
        <section
          key={status.id}
          aria-label={status.label}
          className="w-72 flex-none rounded-jotty border border-border bg-background/60 p-2"
        >
          <h2 className="flex items-center gap-2 px-1.5 pb-2 pt-1 text-sm font-semibold text-foreground">
            <StatusMark status={status} />
            <span className="min-w-0 flex-1 truncate">{status.label}</span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{items.length}</span>
          </h2>
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <BoardCard key={item.id} item={item} ownerShowsEmojis={ownerShowsEmojis} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  </div>
);
