"use client";

import { useState } from "react";
import { CheckCircle, ChevronDown, ChevronRight, Circle } from "lucide-react";
import { Checklist, Item } from "@/app/_types";
import { ProgressBar } from "@/app/_components/GlobalComponents/Statistics/ProgressBar";
import { cn } from "@/app/_utils/global-utils";

interface ChecklistProgressProps {
  checklist: Checklist;
}

const countItems = (items: Item[]): { total: number; completed: number } => {
  let total = 0;
  let completed = 0;

  items.forEach((item) => {
    total++;
    if (item.completed) {
      completed++;
    }

    if (item.children && item.children.length > 0) {
      const childCounts = countItems(item.children);
      total += childCounts.total;
      completed += childCounts.completed;
    }
  });

  return { total, completed };
};

export const ChecklistProgress = ({ checklist }: ChecklistProgressProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { total: totalCount, completed: completedCount } = countItems(checklist.items);
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="border-t-0 bg-gradient-to-br from-muted/40 to-muted/20 border border-border/50 overflow-hidden backdrop-blur-sm transition-all duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-1.5 px-3 hover:bg-muted/40 transition-colors group"
      >
        <div className="flex items-center gap-2">
          {progress === 100 ? <CheckCircle className="h-3.5 w-3.5 transition-all duration-300 text-primary" /> : <Circle className="h-3.5 w-3.5 transition-all duration-300 text-primary/60" />}
          <span className="text-xs font-medium text-foreground">
            {completedCount}/{totalCount}
          </span>
          <span className="text-xs text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-all duration-200" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-all duration-200" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border/30 px-3 py-2 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Overall progress</span>
              <span className="font-semibold text-foreground">{Math.round(progress)}%</span>
            </div>
            <ProgressBar progress={progress} />
          </div>
        </div>
      )}
    </div>
  );
};
