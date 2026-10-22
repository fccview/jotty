"use client";

import { useTranslations } from "next-intl";
import type { User } from "@/app/_types";
import { ChoiceField, ChoiceOption } from "@/app/_consts/preference-fields";
import { PreferenceSelect, PreferenceValue } from "./PreferenceSelect";

interface PreferenceFieldsProps {
  fields: ChoiceField[];
  settings: Partial<User>;
  errors: Record<string, string>;
  onChange: (key: keyof User, value: PreferenceValue | null) => void;
}

const asValue = (value: unknown): PreferenceValue | undefined =>
  typeof value === "string" || typeof value === "number" ? value : undefined;

export const PreferenceFields = ({ fields, settings, errors, onChange }: PreferenceFieldsProps) => {
  const t = useTranslations();
  const nameOf = (option: ChoiceOption) =>
    option.labelKey ? t(option.labelKey, option.labelValues) : option.label || String(option.id);

  return (
    <>
      {fields.map((field) => {
        const stored = asValue(settings[field.key]);
        const value = stored !== undefined && field.normalise ? field.normalise(stored) : stored;
        const effective = value ?? field.defaultValue;
        const contrast = field.options.find((option) => option.id !== effective);
        const description =
          field.descriptionKey &&
          (field.contrastParam
            ? t(field.descriptionKey, { [field.contrastParam]: contrast ? nameOf(contrast) : "" })
            : t(field.descriptionKey));

        return (
          <PreferenceSelect
            key={field.key}
            inputId={field.inputId}
            label={
              <>
                {t(field.labelKey)}
                {field.badgeKey && (
                  <span className="ml-1 text-md lg:text-sm text-muted-foreground">{t(field.badgeKey)}</span>
                )}
              </>
            }
            description={description || undefined}
            placeholder={field.placeholderKey ? t(field.placeholderKey) : undefined}
            value={value}
            defaultValue={field.defaultValue}
            options={field.options.map((option) => ({ id: option.id, name: nameOf(option) }))}
            error={errors[field.key]}
            onChange={(next) => onChange(field.key, next)}
          />
        );
      })}
    </>
  );
};
