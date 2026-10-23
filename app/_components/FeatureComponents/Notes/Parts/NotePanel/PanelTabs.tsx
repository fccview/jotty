"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { LeftToRightListBulletIcon, Link04Icon, Tag01Icon } from "@hugeicons/core-free-icons";
import { NotePanelTabs } from "@/app/_consts/notes";
import { MENU_ITEM_ACTIVE_CLASS } from "@/app/_consts/styling";
import { cn } from "@/app/_utils/global-utils";

const TAB_ICONS: Record<NotePanelTabs, typeof Tag01Icon> = {
  [NotePanelTabs.CONTENTS]: LeftToRightListBulletIcon,
  [NotePanelTabs.TAGS]: Tag01Icon,
  [NotePanelTabs.LINKS]: Link04Icon,
};

const TAB_LABELS: Record<NotePanelTabs, string> = {
  [NotePanelTabs.CONTENTS]: "notes.contents",
  [NotePanelTabs.TAGS]: "notes.tags",
  [NotePanelTabs.LINKS]: "notePanel.links",
};

interface PanelTabsProps {
  tabs: NotePanelTabs[];
  active: NotePanelTabs;
  counts: Partial<Record<NotePanelTabs, number>>;
  onSelect: (tab: NotePanelTabs) => void;
  trailing?: ReactNode;
}

export const PanelTabs = ({ tabs, active, counts, onSelect, trailing }: PanelTabsProps) => {
  const t = useTranslations();

  return (
    <div className="flex items-center gap-1 border-b border-dashed border-border p-2">
      <div role="tablist" className="flex flex-1 items-center gap-1 min-w-0 overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => {
          const isActive = tab === active;
          const count = counts[tab];
          const label = t(TAB_LABELS[tab]);
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(tab)}
              className={cn(
                "flex flex-none items-center gap-1.5 rounded-[calc(var(--jotty-radius-effective)*0.75)] px-2.5 py-1.5 text-md lg:text-sm transition-colors duration-150 focus-visible:outline-none",
                isActive
                  ? MENU_ITEM_ACTIVE_CLASS
                  : "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted",
              )}
            >
              <HugeiconsIcon icon={TAB_ICONS[tab]} className="h-4 w-4 flex-none" />
              <span className="whitespace-nowrap">{label}</span>
              {count !== undefined && count > 0 && (
                <span className="font-mono text-[11px] tabular-nums opacity-70">{count}</span>
              )}
            </button>
          );
        })}
      </div>
      {trailing}
    </div>
  );
};
