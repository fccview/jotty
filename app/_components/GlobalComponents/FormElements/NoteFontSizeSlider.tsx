"use client";

import { useTranslations } from "next-intl";
import {
  MAX_NOTE_FONT_SIZE,
  MIN_NOTE_FONT_SIZE,
  NOTE_FONT_SIZE_STEP,
  noteFontSizeToPx,
} from "@/app/_consts/styling";
import { RangeSlider } from "@/app/_components/GlobalComponents/FormElements/RangeSlider";

interface NoteFontSizeSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const NoteFontSizeSlider = ({
  value,
  onChange,
  disabled = false,
}: NoteFontSizeSliderProps) => {
  const t = useTranslations();
  const size = noteFontSizeToPx(value);

  return (
    <div className="space-y-4">
      <RangeSlider
        id="note-font-size"
        label={t("settingsModal.noteFontSize")}
        value={value}
        min={MIN_NOTE_FONT_SIZE}
        max={MAX_NOTE_FONT_SIZE}
        step={NOTE_FONT_SIZE_STEP}
        valueText={size}
        onChange={onChange}
        disabled={disabled}
      />
      <p
        className="border border-border bg-muted/30 rounded-jotty p-4 text-foreground leading-relaxed"
        style={{ fontSize: size }}
      >
        {t("settingsModal.noteFontSizePreview")}
      </p>
    </div>
  );
};
