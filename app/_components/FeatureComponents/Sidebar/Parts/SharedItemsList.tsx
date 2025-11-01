"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Users,
  User,
  FileText,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/app/_utils/global-utils";
import { AppMode, Checklist, Note } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { capitalize } from "lodash";

interface SharedItemsListProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onItemClick: (item: Checklist | Note) => void;
  isItemSelected: (item: Checklist | Note) => boolean;
  mode: AppMode;
}

interface SharedItemEntry {
  id: string;
  category: string;
  sharer: string;
}

export const SharedItemsList = ({
  collapsed,
  onToggleCollapsed,
  onItemClick,
  isItemSelected,
  mode,
}: SharedItemsListProps) => {
  const [collapsedUsers, setCollapsedUsers] = useState<Set<string>>(new Set());
  const { userSharedItems } = useAppMode();

  if (!userSharedItems) {
    return null;
  }

  const modeItems =
    mode === "checklists" ? userSharedItems.checklists : userSharedItems.notes;

  if (modeItems.length === 0) {
    return null;
  }

  const groupedBySharer = modeItems.reduce((acc, item) => {
    const sharer = item.sharer || "Unknown";
    if (!acc[sharer]) {
      acc[sharer] = [];
    }
    acc[sharer].push(item);
    return acc;
  }, {} as Record<string, SharedItemEntry[]>);

  const toggleUserCollapsed = (sharer: string) => {
    setCollapsedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sharer)) {
        newSet.delete(sharer);
      } else {
        newSet.add(sharer);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-1 overflow-hidden">
      <div className="flex items-center justify-between group">
        <button
          onClick={onToggleCollapsed}
          className={cn(
            "flex items-center gap-2 py-2 pr-2 text-sm rounded-md transition-colors w-full text-left",
            "hover:bg-muted/50 cursor-pointer"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          <Users className="h-4 w-4 text-primary" />
          <span className="truncate font-medium text-primary">
            Shared with you
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            {modeItems.length}
          </span>
        </button>
      </div>

      {!collapsed && (
        <div className="ml-6 space-y-1">
          {Object.entries(groupedBySharer).map(([sharer, sharerItems]) => {
            const isUserCollapsed = collapsedUsers.has(sharer);

            return (
              <div key={sharer} className="space-y-1">
                <button
                  onClick={() => toggleUserCollapsed(sharer)}
                  className={cn(
                    "flex items-center gap-2 py-2 pr-2 text-sm rounded-md transition-colors w-full text-left",
                    "hover:bg-muted/50 cursor-pointer"
                  )}
                >
                  {isUserCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate font-medium text-foreground">
                    {sharer}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {sharerItems.length}
                  </span>
                </button>

                {!isUserCollapsed && (
                  <div className="ml-6 space-y-1">
                    {sharerItems.map((item) => {
                      const minimalItem = {
                        id: item.id,
                        category: item.category,
                        title: item.id,
                      } as any;

                      const isSelected = isItemSelected(minimalItem);

                      return (
                        <button
                          key={`${item.id}-${item.category}`}
                          onClick={() => onItemClick(minimalItem)}
                          className={cn(
                            "flex items-center gap-2 py-2 pr-2 text-sm rounded-md transition-colors w-full text-left",
                            "hover:bg-muted/50 cursor-pointer",
                            isSelected && "bg-accent"
                          )}
                        >
                          {mode === "checklists" ? (
                            <CheckSquare className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="truncate text-foreground">
                            {capitalize(item.id.replace(/-/g, " "))}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
