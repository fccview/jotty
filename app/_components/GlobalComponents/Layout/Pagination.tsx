"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  totalItems?: number;
  variant?: "default" | "compact";
  className?: string;
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
}: PaginationProps) => {

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

  const visiblePages = getVisiblePages();

  const itemsPerPageOptions = [
    { id: "10", name: "10 per page" },
    { id: "30", name: "30 per page" },
    { id: "50", name: "50 per page" },
    { id: "100", name: "100 per page" },
  ];

  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Page</span>
          <span className="text-xs text-muted-foreground">
            {currentPage} of {totalPages}
          </span>
        </div>

        {itemsPerPage && onItemsPerPageChange && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Items per page</label>
            <Dropdown
              value={itemsPerPage.toString()}
              options={itemsPerPageOptions}
              onChange={(value) => onItemsPerPageChange(parseInt(value))}
              className="w-full"
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
            <ChevronLeft className="h-3 w-3 mr-1" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex-1 h-8 text-xs"
          >
            Next
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
