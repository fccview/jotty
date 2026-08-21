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
  /**
   * When true, no custom width has been chosen and the instance default
   * (auto-fit) is in effect. The slider shows "Auto fit" as the label until
   * the user drags it, which switches to a custom preset.
   */
  isDefault?: boolean;
}

// Map a px value to a friendly named preset.
// Widths at or below the lower bound read as "Compact", above the upper as "Wide",
// and everything in between reads as "Comfortable".
const COMPACT_MAX = 240;
const COMFORTABLE_MAX = 360;

const widthToPresetKey = (width: number): string => {
  if (width <= COMPACT_MAX) return "settingsModal.kanbanColumnWidthCompact";
  if (width <= COMFORTABLE_MAX)
    return "settingsModal.kanbanColumnWidthComfortable";
  return "settingsModal.kanbanColumnWidthWide";
};

/**
 * Slider that lets the user pick a custom width for kanban status columns.
 * Shows a friendly named preset (Compact / Comfortable / Wide) instead of a
 * raw pixel value, for better UX.
 */
export const ColumnWidthSlider = ({
  value,
  onChange,
  disabled = false,
  isDefault = false,
}: ColumnWidthSliderProps) => {
  const t = useTranslations();
  const presetLabel = isDefault
    ? t("settingsModal.kanbanColumnWidthAutoFit")
    : t(widthToPresetKey(value));

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
          aria-valuetext={presetLabel}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full accent-primary disabled:opacity-50"
        />
        <span
          className="w-20 shrink-0 whitespace-nowrap overflow-hidden text-right font-medium text-md lg:text-xs text-muted-foreground"
        >
          {presetLabel}
        </span>
      </div>
    </div>
  );
};
