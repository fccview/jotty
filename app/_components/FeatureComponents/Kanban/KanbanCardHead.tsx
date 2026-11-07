"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Item, KanbanStatus } from "@/app/_types";
import { TaskStatusLabels } from "@/app/_types/enums";
import { cn } from "@/app/_utils/global-utils";
import { getStatusIcon } from "@/app/_utils/kanban";
import { plainItemText } from "@/app/_utils/item-href-utils";
import { ProgressBar } from "@/app/_components/GlobalComponents/Statistics/ProgressBar";
import { ChecklistItemText } from "@/app/_components/FeatureComponents/Checklists/Parts/Common/ChecklistItemText";

interface KanbanCardHeadProps {
  item: Item;
  statuses: KanbanStatus[];
  tagsEnabled?: boolean;
  hideStatus?: boolean;
  leading?: ReactNode;
  editor?: ReactNode;
  menu?: ReactNode;
  aside?: ReactNode;
  onOpen?: () => void;
}

const _statusLabel = (statuses: KanbanStatus[], status?: string) =>
  status ? (statuses.find((entry) => entry.id === status)?.label ?? status) : TaskStatusLabels.TODO;

export const KanbanCardHead = ({
  item,
  statuses,
  tagsEnabled,
  hideStatus = false,
  leading,
  editor,
  menu,
  aside,
  onOpen,
}: KanbanCardHeadProps) => {
  const t = useTranslations();
  const subtasks = item.children || [];
  const doneSubtasks = subtasks.filter((child) => child.completed).length;

  return (
    <div className="space-y-2 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {leading}
          {editor || (
            <p
              className={cn(
                "text-md lg:text-sm font-medium text-foreground leading-tight",
                onOpen ? "truncate cursor-pointer" : "break-words min-w-0",
              )}
              title={plainItemText(item.text)}
              onPointerDown={onOpen && ((event) => event.stopPropagation())}
              onMouseDown={onOpen}
              onClick={onOpen}
            >
              <ChecklistItemText text={item.text} tagsEnabled={tagsEnabled} compact />
            </p>
          )}
        </div>

        {menu && (
          <div className="flex items-center" onPointerDown={(event) => event.stopPropagation()}>
            {menu}
          </div>
        )}
      </div>

      {(!hideStatus || aside) && (
        <div className="flex items-center justify-between text-xs">
          {!hideStatus && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              {getStatusIcon(item.status)}
              <span>{_statusLabel(statuses, item.status)}</span>
            </div>
          )}
          {aside}
        </div>
      )}

      {subtasks.length > 0 && (
        <>
          <div className="flex items-center justify-between text-sm lg:text-xs text-muted-foreground">
            <span>{t("checklists.subtasks")}</span>
            <span>
              {doneSubtasks}/{subtasks.length}
            </span>
          </div>
          <ProgressBar progress={Math.round((doneSubtasks / subtasks.length) * 100)} />
        </>
      )}
    </div>
  );
};
