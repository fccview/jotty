"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown01Icon, ArrowRight01Icon } from "hugeicons-react";
import { Item } from "@/app/_types";

interface KanbanCardHistoryProps {
  history: NonNullable<Item["history"]>;
  formatDateTimeString: (value: string) => string;
}

export const KanbanCardHistory = ({ history, formatDateTimeString }: KanbanCardHistoryProps) => {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const Chevron = isOpen ? ArrowDown01Icon : ArrowRight01Icon;

  return (
    <div className="border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <Chevron className="h-4 w-4" />
        {t("common.statusChanges", { count: history.length })}
      </button>
      {isOpen && (
        <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
          {history.map((change, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-jotty px-3 py-2"
            >
              <span className="font-medium text-foreground">{change.status}</span>
              <span className="text-muted-foreground/50">&bull;</span>
              <span>{change.user}</span>
              <span className="text-muted-foreground/50">&bull;</span>
              <span>{formatDateTimeString(change.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
