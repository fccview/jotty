"use client";

import { useTranslations } from "next-intl";
import { CheckmarkCircle04Icon } from "hugeicons-react";
import { ListSummary } from "@/app/_types";
import { NEXT_UP_SHOWN } from "@/app/_utils/browse/list-summary-utils";
import { useRandomLine } from "@/app/_hooks/useRandomLine";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";
import { cn } from "@/app/_utils/global-utils";
import { plainItemText } from "@/app/_utils/item-href-utils";
import { SMALL_RADIUS_CLASS } from "@/app/_consts/styling";

interface NextUpProps {
  uuid: string;
  summary: ListSummary;
}

export const NextUp = ({ uuid, summary }: NextUpProps) => {
  const t = useTranslations();
  const compact = useCompactNumber();
  const doneLine = useRandomLine("browse.allDone", uuid);
  const { total, open } = summary;
  const openCount = total - summary.completed;

  if (!total) {
    return (
      <p className="text-md lg:text-sm text-muted-foreground">
        {t("browse.emptyList")}
      </p>
    );
  }

  if (!openCount) {
    return (
      <p className="flex items-start gap-2 text-md lg:text-sm font-medium text-primary">
        <CheckmarkCircle04Icon className="h-4 w-4 mt-0.5 shrink-0" />
        <span>{doneLine}</span>
      </p>
    );
  }

  return (
    <ul className="space-y-1 text-md lg:text-sm">
      {open.map((item) => (
        <li key={item.id} className="flex items-center gap-2 text-foreground/80">
          <span className={cn("h-3.5 w-3.5 shrink-0 border-[1.5px] border-muted-foreground/40", SMALL_RADIUS_CLASS)} />
          <span className="truncate">{plainItemText(item.text)}</span>
        </li>
      ))}
      {openCount > NEXT_UP_SHOWN && (
        <li className="pl-[22px] text-xs text-muted-foreground">
          {t("browse.more", { count: compact(openCount - NEXT_UP_SHOWN) })}
        </li>
      )}
    </ul>
  );
};
