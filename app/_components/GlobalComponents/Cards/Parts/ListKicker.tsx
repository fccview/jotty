"use client";

import { useTranslations } from "next-intl";
import { CheckmarkSquare04Icon, TaskDaily01Icon } from "hugeicons-react";
import { Checklist } from "@/app/_types";
import { isKanbanType, Modes } from "@/app/_types/enums";
import { categoryLeaf } from "@/app/_utils/category-path-utils";
import { ItemShareMark } from "./ItemShareMark";

export const ListKicker = ({ list }: { list: Checklist }) => {
  const t = useTranslations();
  const Icon = isKanbanType(list.type) ? TaskDaily01Icon : CheckmarkSquare04Icon;

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-0">
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">
        {categoryLeaf(list.category, t("notes.uncategorized"))}
      </span>
      <ItemShareMark item={list} mode={Modes.CHECKLISTS} iconClassName="h-3 w-3" />
    </div>
  );
};
