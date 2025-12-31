"use client";

import { cn } from "@/app/_utils/global-utils";
import { DynamicLogo } from "@/app/_components/GlobalComponents/Layout/Logo/DynamicLogo";
import { AppName } from "@/app/_components/GlobalComponents/Layout/AppName";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { CategoryMultiselect } from "@/app/_components/GlobalComponents/Dropdowns/CategoryMultiselect";
import { Pagination } from "@/app/_components/GlobalComponents/Layout/Pagination";
import { Category } from "@/app/_types";
import { useTranslations } from "next-intl";
import { useSettingsSidebar } from "@/app/_hooks/useSettingsSidebar";
import { useAppMode } from "@/app/_providers/AppModeProvider";

interface FiltersSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  filterValue: string;
  filterOptions: Array<{ id: string; name: string }>;
  onFilterChange: (value: string) => void;
  categories: Category[];
  selectedCategories: string[];
  onCategorySelectionChange: (selectedPaths: string[]) => void;
  onClearAllCategories: () => void;
  recursive?: boolean;
  onRecursiveChange?: (recursive: boolean) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
  onItemsPerPageChange?: (items: number) => void;
  totalItems?: number;
}

export const FiltersSidebar = ({
  isOpen,
  onClose,
  title,
  filterValue,
  filterOptions,
  onFilterChange,
  categories,
  selectedCategories,
  onCategorySelectionChange,
  onClearAllCategories,
  recursive,
  onRecursiveChange,
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
}: FiltersSidebarProps) => {
  const t = useTranslations();
  const { sidebarWidth, isResizing, startResizing } = useSettingsSidebar();
  const { isDemoMode, isRwMarkable } = useAppMode();

  const showPagination = currentPage !== undefined && totalPages !== undefined && onPageChange;

  return (
    <>
      <div
        className={cn(
          "jotty-sidebar-overlay fixed inset-0 z-40 bg-black/50 lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      <aside
        style={
          {
            "--sidebar-desktop-width": `${sidebarWidth}px`,
            transition: isResizing ? "none" : undefined,
          } as React.CSSProperties
        }
        className={cn(
          "jotty-sidebar fixed left-0 top-0 z-50 h-full bg-background border-r border-border flex flex-col lg:static",
          "transition-transform duration-300 ease-in-out",
          "w-[80vw]",
          "lg:w-[var(--sidebar-desktop-width)] lg:min-w-[var(--sidebar-desktop-width)] lg:max-w-[var(--sidebar-desktop-width)]",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "flex-none"
        )}
      >
        <div
          className="jotty-sidebar-resize-handle absolute top-0 right-0 w-2 h-full cursor-ew-resize hidden lg:block hover:bg-primary/10"
          onMouseDown={startResizing}
        />

        <div className="jotty-sidebar-content flex flex-col h-full">
          <div className="jotty-sidebar-header p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <a href="/" className="flex items-center gap-3">
                <DynamicLogo className="h-8 w-8" size="32x32" />
                <div className="flex items-center gap-2">
                  <AppName
                    className="text-xl font-bold text-foreground jotty-app-name"
                    fallback={isRwMarkable ? "rwMarkable" : "jotty·page"}
                  />
                  {isDemoMode && (
                    <span className="text-sm text-muted-foreground font-medium">
                      (demo)
                    </span>
                  )}
                </div>
              </a>
            </div>
          </div>

          <div className="jotty-sidebar-categories flex-1 overflow-y-auto hide-scrollbar p-2 space-y-4">
            <div className="px-2 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="jotty-sidebar-categories-title text-xs font-bold uppercase text-muted-foreground tracking-wider">
                  {t('common.filters')}
                </h3>
              </div>
            </div>

            <div className="space-y-4 px-2">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {title}
                </label>
                <Dropdown
                  value={filterValue}
                  options={filterOptions}
                  onChange={onFilterChange}
                  className="w-full"
                />
              </div>

              <CategoryMultiselect
                categories={categories}
                selectedCategories={selectedCategories}
                onSelectionChange={onCategorySelectionChange}
                onClearAll={onClearAllCategories}
                recursive={recursive}
                placeholder={t('common.filterByCategories')}
                onRecursiveChange={onRecursiveChange}
              />
            </div>
          </div>

          {showPagination && (
            <div className="border-t border-border p-4">
              <Pagination
                currentPage={currentPage!}
                totalPages={totalPages!}
                onPageChange={onPageChange!}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={onItemsPerPageChange}
                totalItems={totalItems}
                dropdownDirection="up"
                variant="sidebar"
              />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
