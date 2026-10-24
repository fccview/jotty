"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "../Buttons/Button";

interface TemplateNameFormProps {
  onSubmit: (name: string) => Promise<boolean>;
  onCancel: () => void;
  disabled: boolean;
}

export const TemplateNameForm = ({
  onSubmit,
  onCancel,
  disabled,
}: TemplateNameFormProps) => {
  const t = useTranslations();
  const [name, setName] = useState("");
  const trimmed = name.trim();

  const submit = async () => {
    if (!trimmed || disabled) return;
    if (await onSubmit(trimmed)) setName("");
  };

  return (
    <div className="jotty-template-name-form flex gap-2 items-center">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          submit();
        }}
        className="flex-1 min-w-0 px-3 py-2 bg-background border border-input rounded-jotty focus:outline-none focus:ring-none focus:ring-ring"
        placeholder={t("templates.namePlaceholder")}
        aria-label={t("templates.namePlaceholder")}
        disabled={disabled}
        autoFocus
      />
      <Button type="button" onClick={submit} disabled={!trimmed || disabled}>
        {t("common.create")}
      </Button>
      <Button type="button" variant="outline" onClick={onCancel} disabled={disabled}>
        {t("common.cancel")}
      </Button>
    </div>
  );
};
