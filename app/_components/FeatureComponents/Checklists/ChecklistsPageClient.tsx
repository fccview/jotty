"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Folder01Icon,
  CheckmarkCircle04Icon,
  TradeUpIcon,
  Clock01Icon,
  CheckmarkSquare04Icon,
} from "hugeicons-react";
import { Checklist, Category, User } from "@/app/_types";
import { EmptyState } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import { ChecklistCard } from "@/app/_components/GlobalComponents/Cards/ChecklistCard";
import { Pagination } from "@/app/_components/GlobalComponents/Layout/Pagination";
import { SiteHeader } from "@/app/_components/GlobalComponents/Layout/SiteHeader";
import { FilterSidebar } from "@/app/_components/GlobalComponents/Layout/FilterSidebar";
import { usePagination } from "@/app/_hooks/usePagination";
import { isItemCompleted } from "@/app/_utils/checklist-utils";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { togglePin } from "@/app/_server/actions/dashboard";
import { ItemTypes } from "@/app/_types/enums";
import { Loading } from "@/app/_components/GlobalComponents/Layout/Loading";
import { useTranslations } from "next-intl";

interface ChecklistsPageClientProps {
  initialLists: Checklist[];
  initialCategories: Category[];
  user: User | null;
}

type ChecklistFilter =
  | "all"
  | "completed"
  | "incomplete"
  | "pinned"
  | "task"
  | "simple";

export const ChecklistsPageClient = ({
  initialLists,
  initialCategories,
  user,
}: ChecklistsPageClientProps) => {
  const t = useTranslations('checklists');
  const router = useRouter();
  const { openCreateChecklistModal } = useShortcut();
  const { isInitialized } = useAppMode();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [checklistFilter, setChecklistFilter] =
    useState<ChecklistFilter>(user?.defaultChecklistFilter || "all");
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [isTogglingPin, setIsTogglingPin] = useState<string | null>(null);
  const [recursive, setRecursive] = useState(false);

  const filterOptions = [
    { id: "all", name: t('allChecklists') },
    { id: "completed", name: t('completed') },
    { id: "incomplete", name: t('incomplete') },
    { id: "pinned", name: t('pinned') },
    { id: "task", name: t('taskLists') },
    { id: "simple", name: t('simpleLists') },
  ];

  const filteredLists = useMemo(() => {
    let filtered = [...initialLists];

    if (checklistFilter === "pinned") {
      const pinnedPaths = user?.pinnedLists || [];
      filtered = filtered.filter((list) => {
        const itemPath = `${list.category || "Uncategorized"}/${list.id}`;
        return pinnedPaths.includes(itemPath);
      });
    } else if (checklistFilter === "completed") {
      filtered = filtered.filter(
        (list) =>
          list.items.length > 0 &&
          list.items.every((item) => isItemCompleted(item, list.type))
      );
    } else if (checklistFilter === "incomplete") {
      filtered = filtered.filter(
        (list) =>
          list.items.length === 0 ||
          !list.items.every((item) => isItemCompleted(item, list.type))
      );
    } else if (checklistFilter === "task") {
      filtered = filtered.filter((list) => list.type === "task");
    } else if (checklistFilter === "simple") {
      filtered = filtered.filter((list) => list.type === "simple");
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((list) => {
        const listCategory = list.category || "Uncategorized";
        if (recursive) {
          return selectedCategories.some(
            (selected) =>
              listCategory === selected ||
              listCategory.startsWith(selected + "/")
          );
        }
        return selectedCategories.includes(listCategory);
      });
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [
    initialLists,
    checklistFilter,
    selectedCategories,
    recursive,
    user?.pinnedLists,
  ]);

  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    totalItems,
    handleItemsPerPageChange,
  } = usePagination({
    items: filteredLists,
    itemsPerPage,
    onItemsPerPageChange: setItemsPerPage,
  });

  const handleClearAllCategories = () => {
    setSelectedCategories([]);
  };

  const handleTogglePin = async (list: Checklist) => {
    if (!user || isTogglingPin === list.id) return;

    setIsTogglingPin(list.id);
    try {
      const result = await togglePin(
        list.id,
        list.category || "Uncategorized",
        ItemTypes.CHECKLIST
      );
      if (result.success) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    } finally {
      setIsTogglingPin(null);
    }
  };

  const stats = useMemo(() => {
    const totalLists = initialLists.length;
    const completedItems = initialLists.reduce((acc, list) => {
      return (
        acc +
        list.items.filter((item) => isItemCompleted(item, list.type)).length
      );
    }, 0);
    const totalItems = initialLists.reduce(
      (acc, list) => acc + list.items.length,
      0
    );
    const completionRate =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return { totalLists, completedItems, totalItems, completionRate };
  }, [initialLists]);

  if (!isInitialized) {
    return <Loading />;
  }

  if (initialLists.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <SiteHeader
            title={t('allChecklists')}
            description={t('browseAndManage')}
          />

          <EmptyState
            icon={
              <CheckmarkSquare04Icon className="h-10 w-10 text-muted-foreground" />
            }
            title={t('noChecklistsYet')}
            description={t('createFirstChecklist')}
            buttonText={t('newChecklist')}
            onButtonClick={() => openCreateChecklistModal()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <SiteHeader
          title={t('allChecklists')}
          description={t('browseAndManage')}
        />
        <div className="bg-card border border-border rounded-jotty p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary rounded-jotty">
                <Folder01Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  {stats.totalLists}
                </div>
                <div className="text-xs text-muted-foreground">{t('lists')}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary rounded-jotty">
                <CheckmarkCircle04Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  {stats.completedItems}
                </div>
                <div className="text-xs text-muted-foreground">{t('completed')}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary rounded-jotty">
                <TradeUpIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  {stats.completionRate}%
                </div>
                <div className="text-xs text-muted-foreground">{t('progress')}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary rounded-jotty">
                <Clock01Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  {stats.totalItems}
                </div>
                <div className="text-xs text-muted-foreground">{t('totalItems')}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-8">
          <div className="lg:col-span-1">
            <FilterSidebar
              title={t('byStatus')}
              filterValue={checklistFilter}
              filterOptions={filterOptions}
              onFilterChange={(value) =>
                setChecklistFilter(value as ChecklistFilter)
              }
              categories={initialCategories}
              selectedCategories={selectedCategories}
              onCategorySelectionChange={setSelectedCategories}
              onClearAllCategories={handleClearAllCategories}
              recursive={recursive}
              onRecursiveChange={setRecursive}
              pagination={
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  totalItems={totalItems}
                />
              }
            />
          </div>

          <div className="lg:col-span-3">
            {paginatedItems.length === 0 ? (
              <div className="text-center py-12">
                <Folder01Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {t('noChecklistsFound')}
                </h3>
                <p className="text-muted-foreground">
                  {t('tryAdjustingFiltersChecklist')}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedItems.map((list) => (
                    <ChecklistCard
                      key={list.id}
                      list={list}
                      onSelect={(list) => {
                        const categoryPath = `${
                          list.category || "Uncategorized"
                        }/${list.id}`;
                        router.push(`/checklist/${categoryPath}`);
                      }}
                      isPinned={user?.pinnedLists?.includes(
                        `${list.category || "Uncategorized"}/${list.id}`
                      )}
                      onTogglePin={() => handleTogglePin(list)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
