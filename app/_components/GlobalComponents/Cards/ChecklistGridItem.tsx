"use client";

import { useTranslations } from "next-intl";
import { Checklist } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { useListSummary } from "@/app/_hooks/useListCardStats";
import { categoryLeaf } from "@/app/_utils/category-path-utils";
import { PinToggle } from "./Parts/PinToggle";
import { ItemGlyph } from "./Parts/ItemGlyph";
import { useCardClick } from "@/app/_hooks/useCardClick";

interface ChecklistGridItemProps {
  list: Checklist;
  onSelect: (list: Checklist) => void;
  isPinned?: boolean;
  onTogglePin?: (list: Checklist) => void;
}

export const ChecklistGridItem = ({
  list,
  onSelect,
  isPinned = false,
  onTogglePin,
}: ChecklistGridItemProps) => {
  const t = useTranslations();
  const { total, completed } = useListSummary(list);
  const handleClick = useCardClick(list, onSelect);

  return (
    <div
      onClick={handleClick}
      className="jotty-checklist-grid-item group cursor-pointer bg-card border border-border rounded-jotty p-3 hover:border-primary/50 transition-colors h-full flex flex-col"
    >
      <div className="flex items-start justify-between gap-1">
        <ItemGlyph type={ItemTypes.CHECKLIST} listType={list.type} />
        {onTogglePin && (
          <PinToggle
            isPinned={isPinned}
            onToggle={() => onTogglePin(list)}
            className="p-1 -mr-1 -mt-1"
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => onSelect(list)}
        className="mt-3 text-left font-medium text-md lg:text-sm leading-snug text-foreground group-hover:text-primary line-clamp-2"
      >
        {list.title}
      </button>
      <div className="mt-auto pt-2 flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
        <span className="truncate">
          {categoryLeaf(list.category, t("notes.uncategorized"))}
        </span>
        <span className="text-foreground">
          {completed}/{total}
        </span>
      </div>
    </div>
  );
};
