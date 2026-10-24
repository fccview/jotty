"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Clock01Icon, File02Icon, LockKeyIcon, NoteAddIcon, PencilEdit02Icon } from "hugeicons-react";
import { TemplateSummary } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { formatRelativeTime } from "@/app/_utils/date-utils";
import { itemHref } from "@/app/_utils/global-utils";
import { Button, buttonVariants } from "@/app/_components/GlobalComponents/Buttons/Button";

interface TemplateCardProps {
  template: TemplateSummary;
  onUse: (template: TemplateSummary) => void;
}

export const TemplateCard = ({ template, onUse }: TemplateCardProps) => {
  const t = useTranslations();
  const href = itemHref(ItemTypes.NOTE, template.uuid);

  return (
    <div className="jotty-template-card bg-card border border-border rounded-jotty p-4 hover:shadow-md hover:border-primary/50 transition-all duration-200 flex flex-col h-full">
      <Link href={href} className="flex items-start gap-2 mb-3 group">
        {template.encrypted ? (
          <LockKeyIcon className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
        ) : (
          <File02Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        )}
        <h3
          className="font-medium text-foreground flex-1 leading-snug line-clamp-2 group-hover:text-primary"
          title={template.title}
        >
          {template.title}
        </h3>
      </Link>

      <div className="flex items-center gap-1 text-sm lg:text-xs text-muted-foreground mb-3">
        <Clock01Icon className="h-3 w-3" />
        <span>
          {template.updatedAt
            ? formatRelativeTime(template.updatedAt, t)
            : t("profile.unknown")}
        </span>
      </div>

      <div className="flex gap-2 mt-auto">
        <Button
          size="sm"
          onClick={() => onUse(template)}
          className="flex-1"
          disabled={template.encrypted}
          title={template.encrypted ? t("errors.templateEncrypted") : undefined}
        >
          <NoteAddIcon className="h-3 w-3 mr-1.5" />
          {t("templates.use")}
        </Button>
        <Link
          href={`${href}?editor=true`}
          aria-label={t("templates.edit")}
          title={t("templates.edit")}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <PencilEdit02Icon className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
};
