"use client";

import { useTranslations } from "next-intl";
import { Checklist } from "@/app/_types";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { useListSummary } from "@/app/_hooks/useListCardStats";
import { formatShortTime } from "@/app/_utils/date-utils";
import { categoryTrail } from "@/app/_utils/category-path-utils";
import { PinToggle } from "./Parts/PinToggle";
import { ItemShareMark } from "./Parts/ItemShareMark";
import { Tally } from "./Parts/Tally";
import { ItemIcon } from "./Parts/ItemGlyph";
import { useCardClick } from "@/app/_hooks/useCardClick";

interface ChecklistListItemProps {
  list: Checklist;
  onSelect: (list: Checklist) => void;
  isPinned?: boolean;
  onTogglePin?: (list: Checklist) => void;
}

export const ChecklistListItem = ({
  list,
  onSelect,
  isPinned = false,
  onTogglePin,
}: ChecklistListItemProps) => {
  const t = useTranslations();
  const { total, completed } = useListSummary(list);
  const handleClick = useCardClick(list, onSelect);
  const percent = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      onClick={handleClick}
      className="jotty-checklist-list-item group cursor-pointer bg-card border border-border rounded-jotty hover:border-primary transition-colors"
    >
      <div className="p-3 flex items-center gap-3">
        <ItemIcon type={ItemTypes.CHECKLIST} listType={list.type} className="h-5 w-5 text-primary shrink-0" />
        <button
          type="button"
          onClick={() => onSelect(list)}
          className="flex-1 min-w-0 text-left"
        >
          <span className="block font-medium text-md lg:text-sm text-foreground truncate group-hover:text-primary">
            {list.title}
          </span>
          <span className="block font-mono text-[11px] text-muted-foreground mt-0.5 truncate">
            {categoryTrail(list.category, t("notes.uncategorized"))}
          </span>
        </button>
        <div className="hidden sm:block w-32 shrink-0">
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary rounded-full h-1.5"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        <Tally done={completed} total={total} />
        <span className="hidden md:inline font-mono text-[11px] text-muted-foreground w-8 text-right">
          {formatShortTime(list.updatedAt, t)}
        </span>
        <span className="text-muted-foreground flex items-center gap-1">
          <ItemShareMark item={list} mode={Modes.CHECKLISTS} />
          {onTogglePin && (
            <PinToggle
              isPinned={isPinned}
              onToggle={() => onTogglePin(list)}
              className="p-1"
            />
          )}
        </span>
      </div>
    </div>
  );
};
