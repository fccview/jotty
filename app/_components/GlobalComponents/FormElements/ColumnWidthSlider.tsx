"use client";

import { useTranslations } from "next-intl";
import {
  KANBAN_COLUMN_WIDTH_STEP,
  MAX_KANBAN_COLUMN_WIDTH,
  MIN_KANBAN_COLUMN_WIDTH,
} from "@/app/_consts/styling";
import { RangeSlider } from "@/app/_components/GlobalComponents/FormElements/RangeSlider";

interface ColumnWidthSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  isDefault?: boolean;
}

const COMPACT_MAX = 240;
const COMFORTABLE_MAX = 360;

const widthToPresetKey = (width: number): string => {
  if (width <= COMPACT_MAX) return "settingsModal.kanbanColumnWidthCompact";
  if (width <= COMFORTABLE_MAX)
    return "settingsModal.kanbanColumnWidthComfortable";
  return "settingsModal.kanbanColumnWidthWide";
};

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
    <RangeSlider
      id="kanban-column-width"
      label={t("settingsModal.kanbanColumnWidth")}
      value={value}
      min={MIN_KANBAN_COLUMN_WIDTH}
      max={MAX_KANBAN_COLUMN_WIDTH}
      step={KANBAN_COLUMN_WIDTH_STEP}
      valueText={presetLabel}
      onChange={onChange}
      disabled={disabled}
      valueClassName="font-medium"
    />
  );
};
