"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CheckmarkCircle04Icon } from "hugeicons-react";
import { Checklist } from "@/app/_types";
import { isItemCompleted, leafItems } from "@/app/_utils/checklist-count-utils";
import { useRandomLine } from "@/app/_hooks/useRandomLine";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";
import { cn } from "@/app/_utils/global-utils";
import { plainItemText } from "@/app/_utils/item-href-utils";
import { SMALL_RADIUS_CLASS } from "@/app/_consts/styling";

const SHOWN = 3;

export const NextUp = ({ list }: { list: Checklist }) => {
  const t = useTranslations();
  const compact = useCompactNumber();
  const doneLine = useRandomLine("browse.allDone", list.uuid);

  const { total, open } = useMemo(() => {
    const leaves = leafItems(list.items);
    return {
      total: leaves.length,
      open: leaves.filter((item) => !isItemCompleted(item, list.type)),
    };
  }, [list.items, list.type]);

  if (!total) {
    return (
      <p className="text-md lg:text-sm text-muted-foreground">
        {t("browse.emptyList")}
      </p>
    );
  }

  if (!open.length) {
    return (
      <p className="flex items-start gap-2 text-md lg:text-sm font-medium text-primary">
        <CheckmarkCircle04Icon className="h-4 w-4 mt-0.5 shrink-0" />
        <span>{doneLine}</span>
      </p>
    );
  }

  return (
    <ul className="space-y-1 text-md lg:text-sm">
      {open.slice(0, SHOWN).map((item) => (
        <li key={item.id} className="flex items-center gap-2 text-foreground/80">
          <span className={cn("h-3.5 w-3.5 shrink-0 border-[1.5px] border-muted-foreground/40", SMALL_RADIUS_CLASS)} />
          <span className="truncate">{plainItemText(item.text)}</span>
        </li>
      ))}
      {open.length > SHOWN && (
        <li className="pl-[22px] text-xs text-muted-foreground">
          {t("browse.more", { count: compact(open.length - SHOWN) })}
        </li>
      )}
    </ul>
  );
};
