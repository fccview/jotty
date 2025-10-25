"use client";

import { CheckCircle } from "lucide-react";
import { Checklist } from "@/app/_types";
import { ProgressBar } from "@/app/_components/GlobalComponents/Statistics/ProgressBar";

interface ChecklistProgressProps {
  checklist: Checklist;
}

const countItems = (items: any[]): { total: number; completed: number } => {
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
  const { total: totalCount, completed: completedCount } = countItems(checklist.items);
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-muted/50 px-3 py-2 lg:px-6 lg:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {completedCount} of {totalCount} completed
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          {Math.round(progress)}%
        </span>
      </div>

      <ProgressBar progress={progress} />
    </div>
  );
};
