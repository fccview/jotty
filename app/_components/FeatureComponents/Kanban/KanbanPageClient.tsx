"use client";

import { useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TaskDaily01Icon,
  CheckmarkCircle04Icon,
  TradeUpIcon,
  AlertCircleIcon,
  PlayCircleIcon,
} from "hugeicons-react";
import { Checklist, SanitisedUser } from "@/app/_types";
import { TaskStatus } from "@/app/_types/enums";
import { EmptyState } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import { ChecklistCard } from "@/app/_components/GlobalComponents/Cards/ChecklistCard";
import { ChecklistListItem } from "@/app/_components/GlobalComponents/Cards/ChecklistListItem";
import { ChecklistGridItem } from "@/app/_components/GlobalComponents/Cards/ChecklistGridItem";
import { usePagination } from "@/app/_hooks/usePagination";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { isItemCompleted } from "@/app/_utils/checklist-utils";
import { isOverdue, isDueThisWeek } from "@/app/_utils/kanban/reminder-utils";
import { Logo } from "../../GlobalComponents/Layout/Logo/Logo";
import { useTranslations } from "next-intl";
import { useSettings } from "@/app/_utils/settings-store";
import { useTasksFilter } from "../Checklists/TasksClient";

interface KanbanPageClientProps {
  initialLists: Checklist[];
  user: SanitisedUser | null;
}

export const KanbanPageClient = ({
  initialLists,
  user,
}: KanbanPageClientProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { openCreateChecklistModal } = useShortcut();
  const { isInitialized } = useAppMode();
  const { viewMode } = useSettings();

  const {
    taskFilter,
    selectedCategories,
    recursive,
    itemsPerPage,
    setItemsPerPage,
    setPaginationInfo,
  } = useTasksFilter();

  const filteredLists = useMemo(() => {
    let filtered = [...initialLists];

    if (taskFilter === "pinned") {
      const pinnedPaths = user?.pinnedLists || [];
      filtered = filtered.filter((list) => {
        const uuidPath = `${list.category || "Uncategorized"}/${list.uuid || list.id}`;
        const idPath = `${list.category || "Uncategorized"}/${list.id}`;
        return pinnedPaths.includes(uuidPath) || pinnedPaths.includes(idPath);
      });
    } else if (taskFilter === "completed") {
      filtered = filtered.filter(
        (list) =>
          list.items.length > 0 &&
          list.items.every((item) => isItemCompleted(item, list.type))
      );
    } else if (taskFilter === "incomplete") {
      filtered = filtered.filter(
        (list) =>
          list.items.length === 0 ||
          !list.items.every((item) => isItemCompleted(item, list.type))
      );
    } else if (taskFilter === "todo") {
      filtered = filtered.filter((list) =>
        list.items.some((item) => item.status === TaskStatus.TODO)
      );
    } else if (taskFilter === "in-progress") {
      filtered = filtered.filter((list) =>
        list.items.some((item) => item.status === TaskStatus.IN_PROGRESS)
      );
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
  }, [initialLists, taskFilter, selectedCategories, recursive, user?.pinnedLists]);

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

  useEffect(() => {
    setPaginationInfo({
      currentPage,
      totalPages,
      totalItems,
      onPageChange: goToPage,
      onItemsPerPageChange: handleItemsPerPageChange,
    });
  }, [currentPage, totalPages, totalItems, goToPage, handleItemsPerPageChange, setPaginationInfo]);

  const stats = useMemo(() => {
    const allItems = initialLists.flatMap((list) =>
      list.items.filter((item) => !item.isArchived)
    );
    const totalBoards = initialLists.length;
    const totalItemCount = allItems.length;
    const completedCount = allItems.filter(
      (item) => item.status === TaskStatus.COMPLETED || item.completed
    ).length;
    const completionRate =
      totalItemCount > 0 ? Math.round((completedCount / totalItemCount) * 100) : 0;
    const todoCount = allItems.filter((item) => item.status === TaskStatus.TODO).length;
    const inProgressCount = allItems.filter(
      (item) => item.status === TaskStatus.IN_PROGRESS
    ).length;

    return {
      totalBoards,
      completedCount,
      totalItemCount,
      completionRate,
      todoCount,
      inProgressCount,
    };
  }, [initialLists]);

  if (!isInitialized) {
    return (
      <div className="flex h-screen bg-background w-full">
        <div className="flex-1 flex items-center justify-center">
          <Logo />
        </div>
      </div>
    );
  }

  if (initialLists.length === 0) {
    return (
      <EmptyState
        icon={
          <TaskDaily01Icon className="h-10 w-10 text-muted-foreground" />
        }
        title={t('kanban.noBoardsYet')}
        description={t('kanban.createFirstBoard')}
        buttonText={t('kanban.newBoard')}
        onButtonClick={() => openCreateChecklistModal()}
      />
    );
  }

  const renderList = (list: Checklist) => {
    const categoryPath = `${list.category || "Uncategorized"}/${list.id}`;
    const isPinned = user?.pinnedLists?.includes(categoryPath);

    if (viewMode === 'list') {
      return (
        <ChecklistListItem
          key={list.id}
          list={list}
          onSelect={() => router.push(`/checklist/${categoryPath}`)}
          isPinned={isPinned}
          onTogglePin={() => {}}
        />
      );
    }

    if (viewMode === 'grid') {
      return (
        <ChecklistGridItem
          key={list.id}
          list={list}
          onSelect={() => router.push(`/checklist/${categoryPath}`)}
          isPinned={isPinned}
          onTogglePin={() => {}}
        />
      );
    }

    return (
      <ChecklistCard
        key={list.id}
        list={list}
        onSelect={() => router.push(`/checklist/${categoryPath}`)}
        isPinned={isPinned}
        onTogglePin={() => {}}
      />
    );
  };

  return (
    <>
      <div className="bg-card border border-border rounded-jotty p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-jotty">
              <TaskDaily01Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {stats.totalBoards}
              </div>
              <div className="text-md lg:text-xs text-muted-foreground">{t("kanban.boards")}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-jotty">
              <CheckmarkCircle04Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {stats.completedCount}
              </div>
              <div className="text-md lg:text-xs text-muted-foreground">{t("kanban.completed")}</div>
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
              <div className="text-md lg:text-xs text-muted-foreground">{t("checklists.progress")}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-jotty">
              <AlertCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {stats.todoCount}
              </div>
              <div className="text-md lg:text-xs text-muted-foreground">{t("kanban.todo")}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-jotty">
              <PlayCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {stats.inProgressCount}
              </div>
              <div className="text-md lg:text-xs text-muted-foreground">{t("kanban.inProgress")}</div>
            </div>
          </div>
        </div>
      </div>

      {paginatedItems.length === 0 ? (
        <div className="text-center py-12">
          <TaskDaily01Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t("kanban.noBoards")}
          </h3>
          <p className="text-muted-foreground">
            {t("kanban.tryAdjustingFilters")}
          </p>
        </div>
      ) : (
        <div className="mt-6">
          {viewMode === 'card' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedItems.map(renderList)}
            </div>
          )}
          {viewMode === 'list' && (
            <div className="space-y-3">
              {paginatedItems.map(renderList)}
            </div>
          )}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {paginatedItems.map(renderList)}
            </div>
          )}
        </div>
      )}
    </>
  );
};
