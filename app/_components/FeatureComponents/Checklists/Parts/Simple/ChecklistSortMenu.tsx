"use client";

import { useTranslations } from "next-intl";
import {
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowTurnBackwardIcon,
  ArrowUp02Icon,
  Calendar03Icon,
  PencilEdit02Icon,
  ShuffleIcon,
} from "hugeicons-react";
import { DropdownMenu } from "@/app/_components/GlobalComponents/Dropdowns/DropdownMenu";
import { ItemSort, SortDirection } from "@/app/_types/enums";

interface ChecklistSortMenuProps {
  onSort: (sort: ItemSort, direction?: SortDirection) => void;
  onUndo: () => void;
  canUndo: boolean;
  disabled: boolean;
}

const STAMP_SORTS = [
  { sort: ItemSort.CREATED, heading: "checklists.sortCreated", Icon: Calendar03Icon },
  { sort: ItemSort.MODIFIED, heading: "checklists.sortModified", Icon: PencilEdit02Icon },
];

export const ChecklistSortMenu = ({
  onSort,
  onUndo,
  canUndo,
  disabled,
}: ChecklistSortMenuProps) => {
  const t = useTranslations();

  const stampItems = STAMP_SORTS.flatMap(({ sort, heading, Icon }) => [
    { type: "heading" as const, label: t(heading) },
    {
      type: "item" as const,
      label: t("checklists.sortNewest"),
      icon: <Icon className="h-4 w-4" />,
      onClick: () => onSort(sort, SortDirection.DESC),
    },
    {
      type: "item" as const,
      label: t("checklists.sortOldest"),
      icon: <Icon className="h-4 w-4" />,
      onClick: () => onSort(sort, SortDirection.ASC),
    },
  ]);

  return (
    <DropdownMenu
      align="right"
      disabled={disabled}
      trigger={
        <button
          type="button"
          aria-haspopup="menu"
          disabled={disabled}
          className="flex items-center gap-1 text-md lg:text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {t("checklists.sort")}
          <ArrowDown01Icon className="h-3.5 w-3.5" />
        </button>
      }
      items={[
        { type: "heading", label: t("checklists.sortName") },
        {
          type: "item",
          label: t("checklists.sortAscending"),
          icon: <ArrowUp02Icon className="h-4 w-4" />,
          onClick: () => onSort(ItemSort.ALPHABETICAL, SortDirection.ASC),
        },
        {
          type: "item",
          label: t("checklists.sortDescending"),
          icon: <ArrowDown02Icon className="h-4 w-4" />,
          onClick: () => onSort(ItemSort.ALPHABETICAL, SortDirection.DESC),
        },
        ...stampItems,
        { type: "divider" },
        {
          type: "item",
          label: t("checklists.sortShuffle"),
          icon: <ShuffleIcon className="h-4 w-4" />,
          onClick: () => onSort(ItemSort.SHUFFLE),
        },
        ...(canUndo
          ? [
              { type: "divider" as const },
              {
                type: "item" as const,
                label: t("checklists.undoSort"),
                icon: <ArrowTurnBackwardIcon className="h-4 w-4" />,
                onClick: onUndo,
              },
            ]
          : []),
      ]}
    />
  );
};
