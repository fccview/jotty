import { CheckCircle, Clock, Pin, PinOff } from "lucide-react";
import { Checklist } from "@/app/_types";
import { formatRelativeTime } from "@/app/_utils/date-utils";
import { isItemCompleted } from "@/app/_utils/checklist-utils";
import { useTranslations } from "next-intl";
import { TaskSpecificDetails } from "@/app/_components/GlobalComponents/Cards/TaskSpecificDetails";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { parseChecklistContent } from "@/app/_utils/client-parser-utils";
import { useMemo } from "react";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";

interface ChecklistCardProps {
  list: Checklist;
  onSelect: (list: Checklist) => void;
  isPinned?: boolean;
  onTogglePin?: (list: Checklist) => void;
  isDraggable?: boolean;
  sharer?: string;
  fixedWidth?: number;
}

export const ChecklistCard = ({
  list,
  onSelect,
  isPinned = false,
  onTogglePin,
  isDraggable = false,
  sharer,
  fixedWidth,
}: ChecklistCardProps) => {
  const t = useTranslations();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list?.uuid || list.id,
    disabled: !isDraggable,
  });

  const parsedData = useMemo(() => {
    if ("rawContent" in list) {
      return parseChecklistContent((list as any).rawContent, list.id);
    }
    return null;
  }, [list]);

  const displayTitle = parsedData?.title || list.title;
  const displayItems = parsedData?.items || list.items;

  const totalItems = displayItems?.length || 0;
  const completedItems = displayItems?.filter((item) =>
    isItemCompleted(item, list.type)
  ).length;
  const completionRate =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const style = isDragging
    ? { opacity: 0.4 }
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  const cardStyle = {
    ...style,
    ...(isDraggable && !isDragging ? { cursor: "grab" } : {}),
    ...(fixedWidth
      ? { width: fixedWidth, minWidth: fixedWidth, maxWidth: fixedWidth }
      : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={cardStyle}
      {...(isDraggable ? { ...attributes, ...listeners } : {})}
      className={`jotty-checklist-card bg-card border border-border rounded-lg p-4 hover:shadow-md hover:border-primary/50 transition-shadow duration-200 group ${
        isDragging ? "border-primary/30" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
          onClick={() => onSelect(list)}
          onPointerDown={(e) => isDraggable && e.stopPropagation()}
          onMouseDown={(e) => isDraggable && e.stopPropagation()}
        >
          <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
            {displayTitle}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onTogglePin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(list);
              }}
              className={`${
                isPinned ? "opacity-100" : "opacity-0"
              } group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded`}
              title={isPinned ? t("global.unpin") : t("global.pin")}
            >
              {isPinned ? (
                <PinOff className="h-3 w-3 text-muted-foreground hover:text-primary" />
              ) : (
                <Pin className="h-3 w-3 text-muted-foreground hover:text-primary" />
              )}
            </button>
          )}
          {list.category && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
              {list.category.split("/").pop()}
            </span>
          )}
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{t("global.progress")}</span>
          <span>{completionRate}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all duration-300"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {list.type === "task" && <TaskSpecificDetails items={displayItems} />}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {sharer && (
            <div className="flex items-center gap-1">
              <UserAvatar username={sharer} size="xs" />
              <span className="text-xs text-muted-foreground">
                Shared by {sharer}
              </span>
            </div>
          )}
          {!sharer && (
            <>
              <CheckCircle className="h-3 w-3" />
              <span>
                {completedItems}/{totalItems} {t("global.completed")}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{formatRelativeTime(list.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
};
