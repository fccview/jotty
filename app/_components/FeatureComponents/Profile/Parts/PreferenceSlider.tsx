"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/app/_components/GlobalComponents/FormElements/label";
import { SettingSlider } from "@/app/_components/FeatureComponents/Settings/Parts/SettingSlider";
import { QUICK_SETTINGS, SliderSettingId, sliderOf } from "@/app/_consts/quick-settings";

interface PreferenceSliderProps {
  settingId: SliderSettingId;
  inputId: string;
  label: string;
  description: string;
  value: number | null;
  error?: string;
  instanceRadius?: number;
  onChange: (value: number) => void;
  onCommit: () => void;
  onDefault?: () => void;
}

export const PreferenceSlider = ({
  settingId,
  inputId,
  label,
  description,
  value,
  error,
  instanceRadius,
  onChange,
  onCommit,
  onDefault,
}: PreferenceSliderProps) => {
  const t = useTranslations();
  const control = sliderOf(settingId);
  if (!control) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={inputId}>{label}</Label>
        {onDefault && value !== null && (
          <button
            type="button"
            onClick={onDefault}
            className="text-md lg:text-xs text-primary hover:underline"
          >
            {t("settings.default")}
          </button>
        )}
      </div>
      <SettingSlider
        id={inputId}
        label={t(QUICK_SETTINGS[settingId].labelKey)}
        control={control}
        value={value}
        instanceRadius={instanceRadius}
        onChange={onChange}
        onCommit={onCommit}
      />
      {error && <p className="text-md lg:text-sm text-destructive">{error}</p>}
      <p className="text-md lg:text-sm text-muted-foreground">{description}</p>
    </div>
  );
};
