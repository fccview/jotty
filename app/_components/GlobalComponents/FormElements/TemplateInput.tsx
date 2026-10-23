"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Add01Icon } from "hugeicons-react";
import { TemplateSummary } from "@/app/_types";
import { Button } from "../Buttons/Button";
import { Dropdown } from "../Dropdowns/Dropdown";
import { TemplateNameForm } from "./TemplateNameForm";

const NO_TEMPLATE = "";

interface TemplateInputProps {
  templates: TemplateSummary[];
  selectedTemplate: string;
  onTemplateChange: (uuid: string) => void;
  onMakeBlank: (name: string) => Promise<boolean>;
  disabled: boolean;
}

export const TemplateInput = ({
  templates,
  selectedTemplate,
  onTemplateChange,
  onMakeBlank,
  disabled,
}: TemplateInputProps) => {
  const t = useTranslations();
  const [isNaming, setIsNaming] = useState(false);

  const options = [
    { id: NO_TEMPLATE, name: t("templates.none") },
    ...templates
      .filter((template) => !template.encrypted)
      .map((template) => ({ id: template.uuid, name: template.title })),
  ];

  return (
    <div className="jotty-template-input">
      <label className="block text-md lg:text-sm font-medium text-foreground mb-2">
        {t("templates.title")}
      </label>
      {isNaming ? (
        <TemplateNameForm
          onSubmit={onMakeBlank}
          onCancel={() => setIsNaming(false)}
          disabled={disabled}
        />
      ) : (
        <div className="flex gap-2 items-center">
          <Dropdown
            value={selectedTemplate}
            options={options}
            onChange={onTemplateChange}
            className="flex-1"
            disabled={disabled}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsNaming(true)}
            className="px-3"
            disabled={disabled}
            aria-label={t("templates.newTemplate")}
          >
            <Add01Icon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
