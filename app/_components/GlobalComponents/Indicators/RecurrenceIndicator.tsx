"use client";

import { RefreshIcon } from "hugeicons-react";
import { RecurrenceRule } from "@/app/_types";
import { getRecurrenceDescription } from "@/app/_utils/recurrence-utils";

interface RecurrenceIndicatorProps {
  recurrence: RecurrenceRule;
  className?: string;
}

export const RecurrenceIndicator = ({
  recurrence,
  className = "",
}: RecurrenceIndicatorProps) => {
  const description = getRecurrenceDescription(recurrence);

  return (
    <div
      className={`inline-flex items-center gap-1.5 relative group/recurrence-indicator bg-primary/10 rounded-md p-2 mr-2 h-[22px] ${className}`}
      title={`Recurring: ${description}`}
    >
      <RefreshIcon className="h-4 w-4 text-primary" />

      <span className="hidden group-hover/recurrence-indicator:block whitespace-nowrap text-xs font-medium text-muted-foreground absolute -top-6 left-1/2 -translate-x-1/2 bg-muted capitalize rounded-md p-1 shadow-sm">
        {description}
      </span>
    </div>
  );
};
