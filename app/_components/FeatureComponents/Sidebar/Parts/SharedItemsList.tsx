"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Users, User } from "lucide-react";
import { cn } from "@/app/_utils/global-utils";
import { AppMode, Checklist, Note } from "@/app/_types";
import { SidebarItem } from "./SidebarItem";

interface SharingStatus {
  isShared: boolean;
  isPubliclyShared: boolean;
  sharedWith: string[];
}

interface SharedItemsListProps {
  items: (Checklist | Note)[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onItemClick: (item: Checklist | Note) => void;
  onEditItem?: (item: Checklist | Note) => void;
  isItemSelected: (item: Checklist | Note) => boolean;
  mode: AppMode;
  getSharingStatus: (itemId: string) => SharingStatus | null;
  user?: any;
}

export const SharedItemsList = ({
  items,
  collapsed,
  onToggleCollapsed,
  onItemClick,
  onEditItem,
  isItemSelected,
  mode,
  getSharingStatus,
  user,
}: SharedItemsListProps) => {
  const [collapsedUsers, setCollapsedUsers] = useState<Set<string>>(new Set());

  const sharedItems = items.filter((item) => item.isShared);

  if (sharedItems.length === 0) {
    return null;
  }

  const groupedByOwner = sharedItems.reduce((acc, item) => {
    const owner = item.owner || "Unknown";
    if (!acc[owner]) {
      acc[owner] = [];
    }
    acc[owner].push(item);
    return acc;
  }, {} as Record<string, (Checklist | Note)[]>);

  const toggleUserCollapsed = (owner: string) => {
    setCollapsedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(owner)) {
        newSet.delete(owner);
      } else {
        newSet.add(owner);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-1">
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
            {sharedItems.length}
          </span>
        </button>
      </div>

      {!collapsed && (
        <div className="ml-6 space-y-1">
          {Object.entries(groupedByOwner).map(([owner, ownerItems]) => {
            const isUserCollapsed = collapsedUsers.has(owner);

            return (
              <div key={owner} className="space-y-1">
                <button
                  onClick={() => toggleUserCollapsed(owner)}
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
                    {owner}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {ownerItems.length}
                  </span>
                </button>

                {!isUserCollapsed && (
                  <div className="ml-6 space-y-1">
                    {ownerItems.map((item) => (
                      <SidebarItem
                        key={item.id}
                        item={item}
                        mode={mode}
                        isSelected={isItemSelected(item)}
                        onItemClick={onItemClick}
                        onEditItem={onEditItem}
                        sharingStatus={getSharingStatus(item.id)}
                        user={user}
                      />
                    ))}
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
