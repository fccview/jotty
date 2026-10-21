"use client";

import { ComponentType } from "react";
import { useTranslations } from "next-intl";
import { Cancel01Icon, Folder01Icon } from "hugeicons-react";
import { BrowseSort } from "@/app/_consts/browse";
import { categoryTrail } from "@/app/_utils/category-path-utils";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";

interface ChipProps {
  label: string;
  onRemove: () => void;
  icon?: ComponentType<{ className?: string }>;
}

const Chip = ({ label, onRemove, icon: Icon }: ChipProps) => (
  <button
    type="button"
    onClick={onRemove}
    title={label}
    className="inline-flex items-center gap-1 px-2 py-1 text-sm lg:text-xs bg-primary/10 text-primary rounded-jotty hover:bg-primary/20 max-w-full min-w-0"
  >
    {Icon && <Icon className="h-3 w-3 shrink-0" />}
    <span className="truncate">{label}</span>
    <Cancel01Icon className="h-3 w-3 shrink-0" />
  </button>
);

interface FilterChipsProps {
  filterLabel?: string;
  onClearFilter: () => void;
  categories: string[];
  onRemoveCategory: (path: string) => void;
  sort: BrowseSort;
  sortLabel: string;
  onClearSort: () => void;
  onClearAll: () => void;
  start: number;
  end: number;
  total: number;
}

export const FilterChips = ({
  filterLabel,
  onClearFilter,
  categories,
  onRemoveCategory,
  sort,
  sortLabel,
  onClearSort,
  onClearAll,
  start,
  end,
  total,
}: FilterChipsProps) => {
  const t = useTranslations();
  const compact = useCompactNumber();
  const chips = [
    ...(filterLabel ? [{ key: "filter", label: filterLabel, onRemove: onClearFilter }] : []),
    ...categories.map((path) => ({
      key: path,
      label: categoryTrail(path, t("notes.uncategorized")),
      onRemove: () => onRemoveCategory(path),
      icon: Folder01Icon,
    })),
    ...(sort !== BrowseSort.UPDATED ? [{ key: "sort", label: sortLabel, onRemove: onClearSort }] : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 min-h-7">
      {chips.map(({ key, ...chip }) => (
        <Chip key={key} {...chip} />
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-sm lg:text-xs font-medium text-primary hover:underline"
        >
          {t("common.clear")}
        </button>
      )}
      {total > 0 && (
        <span className="text-md lg:text-xs text-muted-foreground sm:ml-2">
          {t("common.showingResults", { start, end, total: compact(total) })}
        </span>
      )}
    </div>
  );
};
