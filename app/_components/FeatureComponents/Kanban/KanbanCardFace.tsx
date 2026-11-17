"use client";

import { ComponentPropsWithRef, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Checklist, Item } from "@/app/_types";
import { cn } from "@/app/_utils/global-utils";
import { getStatusColor } from "@/app/_utils/kanban";
import { getRecurrenceDescription } from "@/app/_utils/recurrence-utils";
import { KanbanCardChips } from "./KanbanCardChips";

interface KanbanCardShellProps extends ComponentPropsWithRef<"div"> {
  status?: string;
}

export const KanbanCardShell = ({ status, className, ...props }: KanbanCardShellProps) => (
  <div
    {...props}
    className={cn(
      "group bg-background border rounded-jotty p-3 transition-all duration-200 hover:shadow-md min-w-0",
      getStatusColor(status),
      className,
    )}
  />
);

interface KanbanCardFaceProps {
  item: Item;
  checklist: Pick<Checklist, "uuid" | "specNote">;
  head: ReactNode;
  avatarFor?: (username: string) => string;
  tracker?: ReactNode;
  footer?: ReactNode;
}

export const KanbanCardFace = ({ item, checklist, head, avatarFor, tracker, footer }: KanbanCardFaceProps) => {
  const t = useTranslations();

  return (
    <div className="space-y-2">
      {head}
      <KanbanCardChips item={item} checklist={checklist} avatarFor={avatarFor} />
      {tracker}
      {item.recurrence && (
        <div className="text-md lg:text-xs flex items-center gap-1 capitalize !mt-2 border bg-muted-foreground/5 border-muted-foreground/20 rounded-jotty p-2">
          <span className="text-muted-foreground/80">
            {t("kanban.repeats", { description: getRecurrenceDescription(item.recurrence) })}
          </span>
        </div>
      )}
      {footer}
    </div>
  );
};
