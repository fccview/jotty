"use client";

import { useState } from "react";
import { RefreshCw, Info, Calendar as CalendarIcon, X } from "lucide-react";
import { RecurrenceRule } from "@/app/_types";
import {
  RECURRENCE_PRESETS,
  getRecurrenceDescription,
  createRecurrenceFromPreset,
} from "@/app/_utils/recurrence-utils";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import Calendar from "@/app/_components/FeatureComponents/Calendar/Calendar";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";

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
  const [startDate, setStartDate] = useState<Date | undefined>(
    value?.dtstart ? new Date(value.dtstart) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    value?.until ? new Date(value.until) : undefined
  );
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  const handlePresetChange = (presetValue: string) => {
    setSelectedPreset(presetValue);

    if (!presetValue) {
      onChange(undefined);
      setStartDate(undefined);
      setEndDate(undefined);
      return;
    }

    // Create recurrence with current dates (or defaults)
    const recurrence = createRecurrenceFromPreset(
      presetValue,
      startDate,
      endDate
    );
    onChange(recurrence);
  };

  const handleStartDateSelect = (date: Date) => {
    setStartDate(date);
    setShowStartCalendar(false);

    // If end date is before new start date, clear it
    if (endDate && date > endDate) {
      setEndDate(undefined);
    }

    // Update recurrence with new start date
    if (selectedPreset) {
      const recurrence = createRecurrenceFromPreset(
        selectedPreset,
        date,
        endDate && date <= endDate ? endDate : undefined
      );
      onChange(recurrence);
    }
  };

  const handleEndDateSelect = (date: Date) => {
    setEndDate(date);
    setShowEndCalendar(false);

    // Update recurrence with new end date
    if (selectedPreset) {
      const recurrence = createRecurrenceFromPreset(
        selectedPreset,
        startDate,
        date
      );
      onChange(recurrence);
    }
  };

  const handleClearEndDate = () => {
    setEndDate(undefined);
    setShowEndCalendar(false);

    // Update recurrence without end date
    if (selectedPreset) {
      const recurrence = createRecurrenceFromPreset(
        selectedPreset,
        startDate,
        undefined
      );
      onChange(recurrence);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-3">
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

      <Dropdown
        value={selectedPreset}
        onChange={handlePresetChange}
        disabled={disabled}
        options={Object.entries(RECURRENCE_PRESETS).map(([key, preset]) => ({
          id: preset.value,
          name: preset.label,
        }))}
        placeholder="Select recurrence pattern"
      />

      {selectedPreset && selectedPreset !== "" && (
        <>
          {/* Date Selection Buttons */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setShowStartCalendar(true)}
                disabled={disabled}
                className="flex items-center gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                {startDate ? formatDate(startDate) : 'Set Start Date'}
              </Button>
              {startDate && (
                <span className="text-xs text-muted-foreground">
                  (optional - defaults to today)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setShowEndCalendar(true)}
                disabled={disabled || !selectedPreset}
                className="flex items-center gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                {endDate ? formatDate(endDate) : 'Set End Date (Optional)'}
              </Button>
              {endDate && (
                <button
                  type="button"
                  onClick={handleClearEndDate}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Clear end date"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Info Message */}
          <div className="flex items-start gap-2 p-3 bg-muted/50 border border-border rounded-lg">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              When you complete this item, it will automatically reappear as
              uncompleted based on the recurrence pattern you selected.
              {endDate && ' The recurrence will stop after the end date.'}
            </p>
          </div>
        </>
      )}

      {/* Start Date Calendar Modal */}
      <Modal
        isOpen={showStartCalendar}
        onClose={() => setShowStartCalendar(false)}
        title="Select Start Date"
      >
        <Calendar
          selectedDate={startDate}
          onDateSelect={handleStartDateSelect}
          mode="single"
          minDate={new Date()}
        />
      </Modal>

      {/* End Date Calendar Modal */}
      <Modal
        isOpen={showEndCalendar}
        onClose={() => setShowEndCalendar(false)}
        title="Select End Date (Optional)"
      >
        <Calendar
          selectedDate={endDate}
          onDateSelect={handleEndDateSelect}
          mode="single"
          minDate={startDate || new Date()}
        />
      </Modal>
    </div>
  );
};
