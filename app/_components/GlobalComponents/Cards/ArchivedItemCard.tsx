"use client";

import { Clock, Archive, FileText, ListTodo } from "lucide-react";
import { ArchivedItem } from "@/app/_server/actions/archived";
import { formatRelativeTime } from "@/app/_utils/date-utils";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";

interface ArchivedItemCardProps {
  item: ArchivedItem;
  onUnarchive: (item: ArchivedItem) => void;
}

export const ArchivedItemCard = ({
  item,
  onUnarchive,
}: ArchivedItemCardProps) => {
  const Icon = item.type === "checklist" ? ListTodo : FileText;

  return (
    <div className="jotty-archived-item-card bg-card border border-border rounded-lg p-4 hover:shadow-md hover:border-primary/50 transition-all duration-200 group flex flex-col h-full">
      <div className="flex items-start gap-2 mb-3">
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <h3
          className="font-medium text-foreground flex-1 leading-snug line-clamp-2"
          title={item.title}
        >
          {item.title}
        </h3>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-1">
          <span className="capitalize">{item.type}</span>
          {item.isShared && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">
              Shared
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{formatRelativeTime(item.updatedAt)}</span>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onUnarchive(item)}
        className="w-full mt-auto"
      >
        <Archive className="h-3 w-3 mr-1.5" />
        Unarchive
      </Button>
    </div>
  );
};
