"use client";

import { useTranslations } from "next-intl";
import { Item } from "@/app/_types";
import { cn } from "@/app/_utils/global-utils";
import { isFullyDone } from "@/app/_utils/item-tree-utils";
import { ChecklistItemText } from "@/app/_components/FeatureComponents/Checklists/Parts/Common/ChecklistItemText";

const SubtaskList = ({ items }: { items: Item[] }) => (
  <ul className="space-y-1 border-l border-border pl-3">
    {items.map((item) => (
      <li key={item.id} className="min-w-0 break-words">
        <span className={cn(isFullyDone(item) && "text-muted-foreground line-through")}>
          <ChecklistItemText text={item.text} compact />
        </span>
        {item.children?.length ? <SubtaskList items={item.children} /> : null}
      </li>
    ))}
  </ul>
);

export const PublicSubtasks = ({ items }: { items: Item[] }) => {
  const t = useTranslations();

  if (!items.length) return null;

  return (
    <details className="text-md lg:text-xs">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
        {t("checklists.showSubtasks")}
      </summary>
      <div className="mt-2">
        <SubtaskList items={items} />
      </div>
    </details>
  );
};
