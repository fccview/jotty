"use client";

import { Check } from "lucide-react";
import { Item } from "@/app/_types";

interface CompletedSuggestionsDropdownProps {
  completedItems: Item[];
  onSuggestionClick: (itemId: string) => void;
  className?: string;
}

export const CompletedSuggestionsDropdown = ({
  completedItems,
  onSuggestionClick,
  className = "",
}: CompletedSuggestionsDropdownProps) => {
  return (
    <div
      className={`bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto ${className}`}
    >
      <div className="p-2">
        <div className="text-xs text-muted-foreground mb-2 px-2">
          Completed tasks - click to re-enable:
        </div>
        {completedItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSuggestionClick(item.id)}
            className="w-full flex items-center gap-2 px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-md transition-colors text-left"
          >
            <Check className="h-3 w-3 text-primary flex-shrink-0" />
            <span className="truncate">
              {item.text.split(" | metadata:")[0].trim()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
