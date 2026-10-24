"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight04Icon } from "hugeicons-react";
import { formatShortTime } from "@/app/_utils/date-utils";
import { categoryTrail } from "@/app/_utils/category-path-utils";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { WidgetDismiss } from "./WidgetDismiss";

interface PickUpCardProps {
  title: string;
  category?: string;
  updatedAt: string;
  actionLabel: string;
  onOpen: () => void;
  footer: ReactNode;
  children: ReactNode;
}

export const PickUpCard = ({
  title,
  category,
  updatedAt,
  actionLabel,
  onOpen,
  footer,
  children,
}: PickUpCardProps) => {
  const t = useTranslations();
  const trail = categoryTrail(category, t("notes.uncategorized"));

  return (
    <section className="jotty-pick-up group/widget bg-card border border-border rounded-jotty p-5 flex flex-col min-w-0 [overflow-wrap:anywhere]">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground truncate">
          {t("settings.homePickUp")}
        </p>
        <span className="flex shrink-0 items-center gap-1">
          <span className="font-mono text-xs text-primary">
            {formatShortTime(updatedAt, t)}
          </span>
          <WidgetDismiss widget="homePickUp" className="-my-1 -mr-2" />
        </span>
      </div>
      <h3
        className="text-2xl font-bold mt-4 leading-tight text-foreground line-clamp-2"
        title={title}
      >
        {title}
      </h3>
      <p className="font-mono text-xs text-muted-foreground mt-1 truncate" title={trail}>
        {trail}
      </p>
      <div className="flex-1 mt-4">{children}</div>
      <div className="mt-5 flex items-center justify-between gap-2">
        {footer}
        <Button variant="soft" size="sm" className="gap-2" onClick={onOpen}>
          {actionLabel}
          <ArrowRight04Icon className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
};
