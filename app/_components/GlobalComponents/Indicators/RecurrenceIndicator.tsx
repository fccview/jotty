"use client";

import { RefreshCw } from "lucide-react";
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
      className={`inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md ${className}`}
      title={`Recurring: ${description}`}
    >
      <RefreshCw className="h-3 w-3 text-blue-600 dark:text-blue-400" />
      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
        {description}
      </span>
    </div>
  );
};
