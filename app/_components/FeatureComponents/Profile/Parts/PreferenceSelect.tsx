"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Dropdown, DropdownOption } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { Label } from "@/app/_components/GlobalComponents/FormElements/label";
import { DEFAULT_OPTION_ID, optionFromRaw, withDefaultOption } from "@/app/_utils/settings/preference-utils";

export type PreferenceValue = string | number;

interface PreferenceSelectProps {
  inputId: string;
  label: ReactNode;
  description?: ReactNode;
  placeholder?: string;
  value: PreferenceValue | undefined;
  defaultValue: PreferenceValue;
  defaultLabel?: string;
  options: DropdownOption[];
  error?: string;
  footer?: ReactNode;
  onChange: (value: PreferenceValue | null) => void;
}

export const PreferenceSelect = ({
  inputId,
  label,
  description,
  placeholder,
  value,
  defaultValue,
  defaultLabel,
  options,
  error,
  footer,
  onChange,
}: PreferenceSelectProps) => {
  const t = useTranslations();
  const defaultName = defaultLabel ?? options.find((option) => option.id === defaultValue)?.name;
  const choices = withDefaultOption(
    options,
    t("settings.defaultOption", { value: typeof defaultName === "string" ? defaultName : String(defaultValue) }),
  );

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Dropdown
        id={inputId}
        value={value ?? DEFAULT_OPTION_ID}
        onChange={(raw) => onChange(optionFromRaw(options, raw))}
        options={choices}
        placeholder={placeholder}
        className="w-full"
      />
      {error && <p className="text-md lg:text-sm text-destructive">{error}</p>}
      {description && <p className="text-md lg:text-sm text-muted-foreground">{description}</p>}
      {footer}
    </div>
  );
};
