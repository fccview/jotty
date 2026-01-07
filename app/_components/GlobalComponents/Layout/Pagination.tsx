"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  MoreHorizontalIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { useTranslations } from "next-intl";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  totalItems?: number;
  variant?: "default" | "compact" | "sidebar";
  className?: string;
  dropdownDirection?: "down" | "up";
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
  variant = "default",
  className = "",
  dropdownDirection = "down",
}: PaginationProps) => {
  const t = useTranslations();
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const itemsPerPageOptions = [12, 24, 36, 72, 84, 120].map((count) => ({
    id: count.toString(),
    name: `${count} ${t('common.perPage')}`,
  }));

  const isSidebar = variant === "sidebar";

  return (
    <div className={className}>
      <div className={isSidebar ? "space-y-3" : "space-y-3 bg-card border border-border rounded-jotty p-4"}>
        <div className="flex items-center justify-between">
          <span className={isSidebar ? "text-md lg:text-sm lg:text-xs font-bold uppercase text-muted-foreground tracking-wider" : "text-md lg:text-sm font-medium text-foreground"}>
            {t('common.page')}
          </span>
          <span className="text-md lg:text-sm lg:text-xs text-muted-foreground">
            {t('common.pageOfPages', { currentPage, totalPages })}
          </span>
        </div>

        {itemsPerPage && onItemsPerPageChange && (
          <div>
            <label className="text-md lg:text-sm lg:text-xs text-muted-foreground mb-2 block">
              {t('common.itemsPerPage')}
            </label>
            <Dropdown
              value={itemsPerPage.toString()}
              options={itemsPerPageOptions}
              onChange={(value) => onItemsPerPageChange(parseInt(value))}
              className="w-full"
              direction={dropdownDirection}
            />
          </div>
        )}

        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex-1 h-8 text-xs"
          >
            <ArrowLeft01Icon className="h-3 w-3 mr-1" />
            {t('common.previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex-1 h-8 text-xs"
          >{t('common.next')}<ArrowRight01Icon className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
