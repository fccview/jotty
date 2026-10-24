"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Add01Icon, MultiplicationSignIcon, Search01Icon } from "hugeicons-react";
import { TemplateSummary } from "@/app/_types";
import { TemplateVariables } from "@/app/_consts/templates";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { useTemplateMaker } from "@/app/_hooks/useTemplates";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { TemplateNameForm } from "@/app/_components/GlobalComponents/FormElements/TemplateNameForm";
import { TemplateCard } from "@/app/_components/GlobalComponents/Cards/TemplateCard";

interface TemplatesPageClientProps {
  templates: TemplateSummary[];
}

const _placeholder = (name: TemplateVariables): string => `{{${name}}}`;

export const TemplatesPageClient = ({ templates }: TemplatesPageClientProps) => {
  const t = useTranslations();
  const { openCreateNoteModal } = useShortcut();
  const { makeBlank, isMaking } = useTemplateMaker();
  const [isNaming, setIsNaming] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const shown = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return needle
      ? templates.filter((template) => template.title.toLowerCase().includes(needle))
      : templates;
  }, [templates, searchQuery]);

  const handleUse = (template: TemplateSummary) =>
    openCreateNoteModal(undefined, { templateId: template.uuid });

  return (
    <div className="jotty-templates-page space-y-6">
      <div className="md:flex items-end justify-between gap-4 space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t("templates.title")}</h2>
          <p className="text-md lg:text-sm text-muted-foreground mt-1">
            {t("templates.subtitle", {
              title: _placeholder(TemplateVariables.TITLE),
              user: _placeholder(TemplateVariables.USER),
            })}
          </p>
        </div>
        {!isNaming && (
          <Button size="sm" className="h-9 gap-1" onClick={() => setIsNaming(true)}>
            <Add01Icon className="h-4 w-4" />
            {t("templates.newTemplate")}
          </Button>
        )}
      </div>

      {isNaming && (
        <TemplateNameForm
          onSubmit={makeBlank}
          onCancel={() => setIsNaming(false)}
          disabled={isMaking}
        />
      )}

      {templates.length > 0 && (
        <div className="relative">
          <Search01Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
          <Input
            id="searchTemplates"
            name="searchTemplates"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("templates.search")}
            className="pl-10 pr-10 !space-y-0 [&>label]:hidden"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
              aria-label={t("common.clear")}
            >
              <MultiplicationSignIcon className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {shown.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {shown.map((template) => (
            <TemplateCard key={template.uuid} template={template} onUse={handleUse} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {templates.length
              ? t("templates.noneFound", { searchQuery })
              : t("templates.empty")}
          </p>
        </div>
      )}
    </div>
  );
};
