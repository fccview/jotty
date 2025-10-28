"use client";

import { useState } from "react";
import { RefreshCw, Info } from "lucide-react";
import { RecurrenceRule } from "@/app/_types";
import { RECURRENCE_PRESETS, getRecurrenceDescription } from "@/app/_utils/recurrence-utils";

interface RecurrenceSelectorProps {
  value?: RecurrenceRule;
  onChange: (recurrence?: RecurrenceRule) => void;
  disabled?: boolean;
}

export const RecurrenceSelector = ({
  value,
  onChange,
  disabled = false,
}: RecurrenceSelectorProps) => {
  const [selectedPreset, setSelectedPreset] = useState<string>(
    value?.rrule || ""
  );

  const handlePresetChange = (presetValue: string) => {
    setSelectedPreset(presetValue);

    if (!presetValue) {
      onChange(undefined);
      return;
    }

    const now = new Date();
    onChange({
      rrule: presetValue,
      dtstart: now.toISOString(),
      nextDue: undefined, // Will be calculated on first save
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Repeat
        </label>
        {value && (
          <span className="text-xs text-muted-foreground">
            ({getRecurrenceDescription(value)})
          </span>
        )}
      </div>

      <select
        value={selectedPreset}
        onChange={(e) => handlePresetChange(e.target.value)}
        disabled={disabled}
        className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {Object.entries(RECURRENCE_PRESETS).map(([key, preset]) => (
          <option key={key} value={preset.value}>
            {preset.label}
          </option>
        ))}
      </select>

      {selectedPreset && selectedPreset !== "" && (
        <div className="flex items-start gap-2 p-3 bg-muted/50 border border-border rounded-lg">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            When you complete this item, it will automatically reappear as uncompleted
            based on the recurrence pattern you selected.
          </p>
        </div>
      )}
    </div>
  );
};
