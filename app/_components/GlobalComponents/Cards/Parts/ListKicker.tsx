"use client";

import { useTranslations } from "next-intl";
import { Checklist } from "@/app/_types";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { categoryLeaf } from "@/app/_utils/category-path-utils";
import { ItemShareMark } from "./ItemShareMark";
import { ItemIcon } from "./ItemGlyph";

export const ListKicker = ({ list }: { list: Checklist }) => {
  const t = useTranslations();

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-0">
      <ItemIcon type={ItemTypes.CHECKLIST} listType={list.type} className="h-3 w-3 shrink-0" />
      <span className="truncate">
        {categoryLeaf(list.category, t("notes.uncategorized"))}
      </span>
      <ItemShareMark item={list} mode={Modes.CHECKLISTS} iconClassName="h-3 w-3" />
    </div>
  );
};
