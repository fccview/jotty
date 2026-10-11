"use client";

import { useTranslations } from "next-intl";
import { Category } from "@/app/_types";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Toggle } from "@/app/_components/GlobalComponents/FormElements/Toggle";
import { CategoryCheckTree } from "@/app/_components/GlobalComponents/Dropdowns/CategoryCheckTree";

interface CategoryFilterProps {
  categories: Category[];
  selected: string[];
  recursive: boolean;
  onToggle: (path: string) => void;
  onRecursive: (recursive: boolean) => void;
  onClear: () => void;
  inMenu?: boolean;
}

export const CategoryFilter = ({
  categories,
  selected,
  recursive,
  onToggle,
  onRecursive,
  onClear,
  inMenu = false,
}: CategoryFilterProps) => {
  const t = useTranslations();

  const recursiveSwitch = (
    <label className="flex items-center gap-2 text-md lg:text-xs text-muted-foreground cursor-pointer">
      <Toggle checked={recursive} onCheckedChange={onRecursive} size="sm" />
      <span>{t("common.recursive")}</span>
    </label>
  );

  const clearButton = selected.length > 0 && (
    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClear}>
      {t("common.clear")}
    </Button>
  );

  if (inMenu) {
    return (
      <div>
        <div className="flex items-center justify-between px-1 pb-2 mb-1 border-b border-border">
          <span className="text-md lg:text-sm font-medium text-foreground">
            {t("common.byCategory")}
          </span>
          <span className="flex items-center gap-3">
            {recursiveSwitch}
            {clearButton}
          </span>
        </div>
        <CategoryCheckTree
          categories={categories}
          selected={selected}
          recursive={recursive}
          onToggle={onToggle}
          countOf={(category) => category.count}
          className="max-h-72 overflow-y-auto"
        />
      </div>
    );
  }

  return (
    <aside className="jotty-category-filter min-w-0 sticky top-0">
      <h3 className="mb-2 text-sm lg:text-xs font-bold uppercase text-muted-foreground tracking-wider">
        {t("common.byCategory")}
      </h3>
      <CategoryCheckTree
        categories={categories}
        selected={selected}
        recursive={recursive}
        onToggle={onToggle}
        countOf={(category) => category.count}
      />
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        {recursiveSwitch}
        {clearButton}
      </div>
    </aside>
  );
};
