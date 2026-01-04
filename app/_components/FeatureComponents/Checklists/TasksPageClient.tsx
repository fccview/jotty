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
import { Logo } from "../../GlobalComponents/Layout/Logo/Logo";
import { useTranslations } from "next-intl";
import { useSettings } from "@/app/_utils/settings-store";
import { useTasksFilter } from "./TasksClient";

interface TasksPageClientProps {
  initialLists: Checklist[];
  user: SanitisedUser | null;
}

export const TasksPageClient = ({
  initialLists,
  user,
}: TasksPageClientProps) => {
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
  }, [
    initialLists,
    taskFilter,
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
    const filteredInitialLists = initialLists.map((list) => {
      return { ...list, items: list.items.filter((item) => !item.isArchived) };
    });
    const totalTasks = filteredInitialLists.length;
    const completedTasks = filteredInitialLists.reduce((acc, list) => {
      return (
        acc +
        list.items.filter((item) => isItemCompleted(item, list.type)).length
      );
    }, 0);
    const totalItems = filteredInitialLists.reduce(
      (acc, list) => acc + list.items.length,
      0
    );
    const completionRate =
      totalItems > 0 ? Math.round((completedTasks / totalItems) * 100) : 0;

    const todoTasks = filteredInitialLists.reduce((acc, list) => {
      return (
        acc +
        list.items.filter((item) => item.status === TaskStatus.TODO).length
      );
    }, 0);

    const inProgressTasks = filteredInitialLists.reduce((acc, list) => {
      return (
        acc +
        list.items.filter((item) => item.status === TaskStatus.IN_PROGRESS)
          .length
      );
    }, 0);

    return {
      totalTasks,
      completedTasks,
      totalItems,
      completionRate,
      todoTasks,
      inProgressTasks,
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
        title={t('tasks.noTaskListsYet')}
        description={t('tasks.createFirstTaskList')}
        buttonText={t('tasks.newTaskList')}
        onButtonClick={() => openCreateChecklistModal()}
      />
    );
  }

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
                {stats.totalTasks}
              </div>
              <div className="text-xs text-muted-foreground">{t("tasks.taskLists")}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-jotty">
              <CheckmarkCircle04Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {stats.completedTasks}
              </div>
              <div className="text-xs text-muted-foreground">{t("tasks.completed")}</div>
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
              <div className="text-xs text-muted-foreground">{t("checklists.progress")}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-jotty">
              <AlertCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {stats.todoTasks}
              </div>
              <div className="text-xs text-muted-foreground">{t("tasks.todo")}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-jotty">
              <PlayCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {stats.inProgressTasks}
              </div>
              <div className="text-xs text-muted-foreground">{t("tasks.inProgress")}</div>
            </div>
          </div>
        </div>
      </div>

      {paginatedItems.length === 0 ? (
        <div className="text-center py-12">
          <TaskDaily01Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t("tasks.noTaskListsFound")}
          </h3>
          <p className="text-muted-foreground">
            {t("tasks.tryAdjustingFiltersTaskList")}
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
                  onTogglePin={() => { }}
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
                  onTogglePin={() => { }}
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
                  onTogglePin={() => { }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
