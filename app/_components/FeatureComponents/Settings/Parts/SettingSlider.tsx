"use client";

import { useTranslations } from "next-intl";
import { RangeSlider } from "@/app/_components/GlobalComponents/FormElements/RangeSlider";
import { SliderControl } from "@/app/_consts/quick-settings";

interface SettingSliderProps {
  id: string;
  label: string;
  control: SliderControl;
  value: number | null;
  onChange: (value: number) => void;
  onCommit?: () => void;
  instanceRadius?: number;
  disabled?: boolean;
  showValue?: boolean;
}

export const SettingSlider = ({
  id,
  label,
  control,
  value,
  onChange,
  onCommit,
  instanceRadius,
  disabled = false,
  showValue = true,
}: SettingSliderProps) => {
  const t = useTranslations();
  const shown = value ?? control.fallback(instanceRadius);

  return (
    <RangeSlider
      id={id}
      label={label}
      value={shown}
      min={control.min}
      max={control.max}
      step={control.step}
      valueText={control.valueText(value, shown, t)}
      onChange={onChange}
      onCommit={onCommit}
      disabled={disabled}
      showValue={showValue}
    />
  );
};
