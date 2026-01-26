"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Folder01Icon,
  CheckmarkCircle04Icon,
  TradeUpIcon,
  Clock01Icon,
  CheckmarkSquare04Icon,
} from "hugeicons-react";
import { Checklist, SanitisedUser } from "@/app/_types";
import { EmptyState } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import { ChecklistCard } from "@/app/_components/GlobalComponents/Cards/ChecklistCard";
import { usePagination } from "@/app/_hooks/usePagination";
import { isItemCompleted } from "@/app/_utils/checklist-utils";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { togglePin } from "@/app/_server/actions/dashboard";
import { ItemTypes } from "@/app/_types/enums";
import { Loading } from "@/app/_components/GlobalComponents/Layout/Loading";
import { useTranslations } from "next-intl";
import { useSettings } from "@/app/_utils/settings-store";
import { ChecklistListItem } from "@/app/_components/GlobalComponents/Cards/ChecklistListItem";
import { ChecklistGridItem } from "@/app/_components/GlobalComponents/Cards/ChecklistGridItem";
import { useChecklistsFilter } from "@/app/_components/FeatureComponents/Checklists/ChecklistsClient";

interface ChecklistsPageClientProps {
  initialLists: Checklist[];
  user: SanitisedUser | null;
}

export const ChecklistsPageClient = ({
  initialLists,
  user,
}: ChecklistsPageClientProps) => {
  const t = useTranslations('checklists');
  const router = useRouter();
  const { openCreateChecklistModal } = useShortcut();
  const { isInitialized } = useAppMode();
  const { viewMode } = useSettings();
  const {
    checklistFilter,
    selectedCategories,
    recursive,
    itemsPerPage,
    setItemsPerPage,
    setPaginationInfo,
  } = useChecklistsFilter();
  const [isTogglingPin, setIsTogglingPin] = useState<string | null>(null);

  const filteredLists = useMemo(() => {
    let filtered = [...initialLists];

    if (checklistFilter === "pinned") {
      const pinnedPaths = user?.pinnedLists || [];
      filtered = filtered.filter((list) => {
        const uuidPath = `${list.category || "Uncategorized"}/${list.uuid || list.id}`;
        const idPath = `${list.category || "Uncategorized"}/${list.id}`;
        return pinnedPaths.includes(uuidPath) || pinnedPaths.includes(idPath);
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

  const { currentPage, totalPages, paginatedItems, goToPage, totalItems, handleItemsPerPageChange } = usePagination({
    items: filteredLists,
    itemsPerPage,
    onItemsPerPageChange: setItemsPerPage,
  });

  useEffect(() => {
    setPaginationInfo({
      currentPage,
      totalPages,
      totalItems,
      onPageChange: goToPage,
      onItemsPerPageChange: handleItemsPerPageChange,
    });
  }, [currentPage, totalPages, totalItems, goToPage, handleItemsPerPageChange, setPaginationInfo]);

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
      <EmptyState
        icon={
          <CheckmarkSquare04Icon className="h-10 w-10 text-muted-foreground" />
        }
        title={t('noChecklistsYet')}
        description={t('createFirstChecklist')}
        buttonText={t('newChecklist')}
        onButtonClick={() => openCreateChecklistModal()}
      />
    );
  }

  return (
    <div className="w-full">
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
              <div className="text-md lg:text-xs text-muted-foreground">{t('lists')}</div>
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
              <div className="text-md lg:text-xs text-muted-foreground">{t('completed')}</div>
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
              <div className="text-md lg:text-xs text-muted-foreground">{t('progress')}</div>
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
              <div className="text-md lg:text-xs text-muted-foreground">{t('totalItems')}</div>
            </div>
          </div>
        </div>
      </div>

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
        <div className="mt-6">
          {viewMode === 'card' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedItems.map((list) => (
                <ChecklistCard
                  key={list.id}
                  list={list}
                  onSelect={(list) => {
                    const categoryPath = `${list.category || "Uncategorized"}/${list.id}`;
                    router.push(`/checklist/${categoryPath}`);
                  }}
                  isPinned={user?.pinnedLists?.includes(
                    `${list.category || "Uncategorized"}/${list.id}`
                  )}
                  onTogglePin={() => handleTogglePin(list)}
                />
              ))}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="space-y-3">
              {paginatedItems.map((list) => (
                <ChecklistListItem
                  key={list.id}
                  list={list}
                  onSelect={(list) => {
                    const categoryPath = `${list.category || "Uncategorized"}/${list.id}`;
                    router.push(`/checklist/${categoryPath}`);
                  }}
                  isPinned={user?.pinnedLists?.includes(
                    `${list.category || "Uncategorized"}/${list.id}`
                  )}
                  onTogglePin={() => handleTogglePin(list)}
                />
              ))}
            </div>
          )}

          {viewMode === 'grid' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {paginatedItems.map((list) => (
                <ChecklistGridItem
                  key={list.id}
                  list={list}
                  onSelect={(list) => {
                    const categoryPath = `${list.category || "Uncategorized"}/${list.id}`;
                    router.push(`/checklist/${categoryPath}`);
                  }}
                  isPinned={user?.pinnedLists?.includes(
                    `${list.category || "Uncategorized"}/${list.id}`
                  )}
                  onTogglePin={() => handleTogglePin(list)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
