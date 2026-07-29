"use client";

import { useTranslations } from "next-intl";
import {
  BORDER_RADIUS_STEP,
  MAX_BORDER_RADIUS,
  MIN_BORDER_RADIUS,
  radiusToRem,
} from "@/app/_consts/styling";

interface RadiusSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  withPreview?: boolean;
}

const RadiusPreview = ({ radius }: { radius: string }) => {
  const t = useTranslations();

  return (
    <div
      className="flex items-center gap-3 border border-border bg-muted/30 p-4"
      style={{ borderRadius: radius }}
    >
      <div
        className="h-10 w-10 shrink-0 bg-primary"
        style={{ borderRadius: radius }}
      />
      <div className="min-w-0 flex-1 space-y-2">
        <div
          className="h-3 w-2/3 bg-muted-foreground/40"
          style={{ borderRadius: radius }}
        />
        <div
          className="h-3 w-1/3 bg-muted-foreground/25"
          style={{ borderRadius: radius }}
        />
      </div>
      <div
        className="shrink-0 bg-primary px-3 py-2 text-md lg:text-xs font-medium text-primary-foreground"
        style={{ borderRadius: radius }}
      >
        {t("common.preview")}
      </div>
    </div>
  );
};

export const RadiusSlider = ({
  value,
  onChange,
  disabled = false,
  withPreview = false,
}: RadiusSliderProps) => {
  const radius = radiusToRem(value);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          id="border-radius"
          type="range"
          min={MIN_BORDER_RADIUS}
          max={MAX_BORDER_RADIUS}
          step={BORDER_RADIUS_STEP}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full accent-primary disabled:opacity-50"
        />
        <span className="w-20 shrink-0 text-right font-mono text-md lg:text-xs text-muted-foreground">
          {radius}
        </span>
      </div>

      {withPreview && <RadiusPreview radius={radius} />}
    </div>
  );
};
