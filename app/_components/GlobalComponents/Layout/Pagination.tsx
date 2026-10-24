"use client";

import { ArrowLeft01Icon, ArrowRight01Icon, MoreHorizontalIcon } from "hugeicons-react";
import { useTranslations } from "next-intl";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { cn } from "@/app/_utils/global-utils";
import { PER_PAGE_OPTIONS } from "@/app/_consts/browse";

const PAGE_DELTA = 2;
const GAP = "...";

type PageSlot = number | typeof GAP;

const visiblePages = (current: number, total: number): PageSlot[] => {
  const range: number[] = [];
  for (
    let page = Math.max(2, current - PAGE_DELTA);
    page <= Math.min(total - 1, current + PAGE_DELTA);
    page++
  ) {
    range.push(page);
  }

  const head: PageSlot[] = current - PAGE_DELTA > 2 ? [1, GAP] : [1];
  const tail: PageSlot[] =
    current + PAGE_DELTA < total - 1 ? [GAP, total] : total > 1 ? [total] : [];

  return [...head, ...range, ...tail];
};

interface PageStepProps {
  isNext: boolean;
  disabled: boolean;
  onClick: () => void;
}

const PageStep = ({ isNext, disabled, onClick }: PageStepProps) => {
  const t = useTranslations();

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled} className="h-8 text-xs">
      {!isNext && <ArrowLeft01Icon className="h-3 w-3 mr-1" />}
      {isNext ? t("common.next") : t("common.previous")}
      {isNext && <ArrowRight01Icon className="h-3 w-3 ml-1" />}
    </Button>
  );
};

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  className?: string;
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  className = "",
}: PaginationProps) => {
  const t = useTranslations();
  const perPageOptions = PER_PAGE_OPTIONS.map((count) => ({
    id: count.toString(),
    name: `${count} ${t("common.perPage")}`,
  }));

  return (
    <div className={cn("jotty-pagination-footer mt-8 pt-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4", className)}>
      <p className="text-md lg:text-sm text-muted-foreground order-2 sm:order-1">
        {t("common.page")}{" "}
        <span className="font-mono text-foreground">
          {t("common.pageOfPages", { currentPage, totalPages })}
        </span>
      </p>
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <PageStep
          isNext={false}
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        />
        <span className="hidden sm:flex items-center gap-1 mx-1">
          {visiblePages(currentPage, totalPages).map((page, index) =>
            page === GAP ? (
              <span key={`gap-${index}`} className="w-6 text-center text-xs text-muted-foreground">
                <MoreHorizontalIcon className="h-3 w-3 mx-auto" />
              </span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "ghost"}
                size="sm"
                onClick={() => onPageChange(page)}
                className="h-8 min-w-8 px-1.5 text-xs font-mono"
              >
                {page}
              </Button>
            ),
          )}
        </span>
        <PageStep
          isNext
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        />
      </div>
      {itemsPerPage && onItemsPerPageChange && (
        <Dropdown
          value={itemsPerPage.toString()}
          options={perPageOptions}
          onChange={(value) => onItemsPerPageChange(parseInt(value))}
          className="order-3 w-40"
          direction="up"
        />
      )}
    </div>
  );
};
