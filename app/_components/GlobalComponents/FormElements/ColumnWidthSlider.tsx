"use client";

import { useTranslations } from "next-intl";
import {
  KANBAN_COLUMN_WIDTH_STEP,
  MAX_KANBAN_COLUMN_WIDTH,
  MIN_KANBAN_COLUMN_WIDTH,
} from "@/app/_consts/styling";

interface ColumnWidthSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * Slider that lets the user pick a custom pixel width for kanban status columns.
 */
export const ColumnWidthSlider = ({
  value,
  onChange,
  disabled = false,
}: ColumnWidthSliderProps) => {
  const t = useTranslations();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          id="kanban-column-width"
          type="range"
          min={MIN_KANBAN_COLUMN_WIDTH}
          max={MAX_KANBAN_COLUMN_WIDTH}
          step={KANBAN_COLUMN_WIDTH_STEP}
          value={value}
          disabled={disabled}
          aria-label={t("settingsModal.kanbanColumnWidth")}
          aria-valuetext={`${value}px`}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full accent-primary disabled:opacity-50"
        />
        <span className="w-20 shrink-0 text-right font-mono text-md lg:text-xs text-muted-foreground">
          {value}px
        </span>
      </div>
    </div>
  );
};