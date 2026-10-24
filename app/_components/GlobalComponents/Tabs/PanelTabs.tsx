"use client";

import { ReactNode } from "react";
import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react";
import { MENU_ITEM_ACTIVE_CLASS } from "@/app/_consts/styling";
import { cn } from "@/app/_utils/global-utils";

export interface PanelTab<T extends string> {
  id: T;
  icon: IconSvgElement;
  label: string;
  count?: number;
}

interface PanelTabsProps<T extends string> {
  tabs: PanelTab<T>[];
  active: T;
  onSelect: (tab: T) => void;
  trailing?: ReactNode;
  label?: string;
  className?: string;
}

export const PanelTabs = <T extends string>({
  tabs,
  active,
  onSelect,
  trailing,
  label,
  className,
}: PanelTabsProps<T>) => (
  <div className={cn("flex items-center gap-1 border-b border-dashed border-border p-2", className)}>
    <div
      role="tablist"
      aria-label={label}
      className="flex flex-1 items-center gap-1 min-w-0 overflow-x-auto hide-scrollbar"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.id)}
            className={cn(
              "flex flex-none items-center gap-1.5 rounded-[calc(var(--jotty-radius-effective)*0.75)] px-2.5 py-1.5 text-md lg:text-sm transition-colors duration-150 focus-visible:outline-none",
              isActive
                ? MENU_ITEM_ACTIVE_CLASS
                : "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted",
            )}
          >
            <HugeiconsIcon icon={tab.icon} className="h-4 w-4 flex-none" />
            <span className="whitespace-nowrap">{tab.label}</span>
            {!!tab.count && (
              <span className="font-mono text-[11px] tabular-nums opacity-70">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
    {trailing}
  </div>
);
