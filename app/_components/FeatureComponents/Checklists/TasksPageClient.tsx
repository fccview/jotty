"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  TaskDaily01Icon,
  CheckmarkCircle04Icon,
  TradeUpIcon,
  AlertCircleIcon,
  PlayCircleIcon,
} from "hugeicons-react";
import { Checklist, Category, User } from "@/app/_types";
import { TaskStatus } from "@/app/_types/enums";
import { EmptyState } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import { ChecklistCard } from "@/app/_components/GlobalComponents/Cards/ChecklistCard";
import { Pagination } from "@/app/_components/GlobalComponents/Layout/Pagination";
import { SiteHeader } from "@/app/_components/GlobalComponents/Layout/SiteHeader";
import { FilterSidebar } from "@/app/_components/GlobalComponents/Layout/FilterSidebar";
import { usePagination } from "@/app/_hooks/usePagination";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { isItemCompleted } from "@/app/_utils/checklist-utils";
import { Logo } from "../../GlobalComponents/Layout/Logo/Logo";
import { useTranslations } from "next-intl";

interface TasksPageClientProps {
  initialLists: Checklist[];
  initialCategories: Category[];
  user: User | null;
}

type TaskFilter =
  | "all"
  | "completed"
  | "incomplete"
  | "pinned"
  | "todo"
  | "in-progress";

export const TasksPageClient = ({
  initialLists,
  initialCategories,
  user,
}: TasksPageClientProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { openCreateChecklistModal } = useShortcut();
  const { isInitialized } = useAppMode();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [recursive, setRecursive] = useState(false);

  const filterOptions = [
    { id: "all", name: t('tasks.allTasks') },
    { id: "completed", name: t('tasks.completed') },
    { id: "incomplete", name: t('checklists.incomplete') },
    { id: "pinned", name: t('checklists.pinned') },
    { id: "todo", name: t('tasks.todo') },
    { id: "in-progress", name: t('tasks.inProgress') },
  ];

  const filteredLists = useMemo(() => {
    let filtered = [...initialLists];

    if (taskFilter === "pinned") {
      const pinnedPaths = user?.pinnedLists || [];
      filtered = filtered.filter((list) => {
        const itemPath = `${list.category || "Uncategorized"}/${list.id}`;
        return pinnedPaths.includes(itemPath);
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

  const handleClearAllCategories = () => {
    setSelectedCategories([]);
  };

  const stats = useMemo(() => {
    const totalTasks = initialLists.length;
    const completedTasks = initialLists.reduce((acc, list) => {
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
      totalItems > 0 ? Math.round((completedTasks / totalItems) * 100) : 0;

    const todoTasks = initialLists.reduce((acc, list) => {
      return (
        acc +
        list.items.filter((item) => item.status === TaskStatus.TODO).length
      );
    }, 0);

    const inProgressTasks = initialLists.reduce((acc, list) => {
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
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <SiteHeader
            title={t('tasks.allTasks')}
            description={t('tasks.browseAndManageTaskLists')}
          />
          <EmptyState
            icon={
              <TaskDaily01Icon className="h-10 w-10 text-muted-foreground" />
            }
            title={t('tasks.noTaskListsYet')}
            description={t('tasks.createFirstTaskList')}
            buttonText={t('tasks.newTaskList')}
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
          title="All Tasks"
          description="Browse and manage all your task lists"
        />
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
                <div className="text-xs text-muted-foreground">Task Lists</div>
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
                <div className="text-xs text-muted-foreground">Completed</div>
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
                <div className="text-xs text-muted-foreground">Progress</div>
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
                <div className="text-xs text-muted-foreground">To Do</div>
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
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <FilterSidebar
              title="By status"
              filterValue={taskFilter}
              filterOptions={filterOptions}
              onFilterChange={(value) => setTaskFilter(value as TaskFilter)}
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
                <TaskDaily01Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No task lists found
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters or create a new task list.
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
                      onTogglePin={() => {}}
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
