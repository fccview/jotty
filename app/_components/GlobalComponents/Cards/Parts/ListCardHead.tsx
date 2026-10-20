"use client";

import { Checklist } from "@/app/_types";
import { cn } from "@/app/_utils/global-utils";
import { PinToggle } from "./PinToggle";
import { ListKicker } from "./ListKicker";

interface ListCardHeadProps {
  list: Checklist;
  onSelect: (list: Checklist) => void;
  isPinned: boolean;
  onTogglePin?: (list: Checklist) => void;
  className: string;
  titleClassName: string;
}

export const ListCardHead = ({
  list,
  onSelect,
  isPinned,
  onTogglePin,
  className,
  titleClassName,
}: ListCardHeadProps) => (
  <div className={cn("flex items-start gap-2", className)}>
    <div className="min-w-0 flex-1">
      <ListKicker list={list} />
      <button
        type="button"
        onClick={() => onSelect(list)}
        className={cn(
          "mt-1 block w-full truncate text-left font-semibold text-foreground group-hover:text-primary transition-colors",
          titleClassName,
        )}
      >
        {list.title}
      </button>
    </div>
    {onTogglePin && (
      <PinToggle isPinned={isPinned} onToggle={() => onTogglePin(list)} className="-mr-2 -mt-1 p-1" />
    )}
  </div>
);
