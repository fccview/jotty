"use client";

import { useTranslations } from "next-intl";
import { Add01Icon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { ViewModeSwitch } from "@/app/_components/GlobalComponents/Buttons/ViewModeSwitch";

interface BrowseHeaderProps {
  kicker: string;
  title: string;
  subtitle: string;
  createLabel: string;
  onCreate: () => void;
}

export const BrowseHeader = ({
  kicker,
  title,
  subtitle,
  createLabel,
  onCreate,
}: BrowseHeaderProps) => {
  const t = useTranslations();

  return (
    <div className="jotty-browse-header flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">{kicker}</p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
          {title}
        </h1>
        <p className="mt-2 text-md lg:text-base text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <ViewModeSwitch />
        <Button size="sm" className="h-9 gap-1" onClick={onCreate}>
          <Add01Icon className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">{createLabel}</span>
          <span className="sm:hidden">{t("common.new")}</span>
        </Button>
      </div>
    </div>
  );
};
