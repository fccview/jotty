"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Folder, CheckCircle, TrendingUp, Clock } from "lucide-react";
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
  const router = useRouter();
  const { openCreateChecklistModal } = useShortcut();
  const { isInitialized } = useAppMode();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [checklistFilter, setChecklistFilter] =
    useState<ChecklistFilter>("all");
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const filterOptions = [
    { id: "all", name: "All Checklists" },
    { id: "completed", name: "Completed" },
    { id: "incomplete", name: "Incomplete" },
    { id: "pinned", name: "Pinned" },
    { id: "task", name: "Task Lists" },
    { id: "simple", name: "Simple Lists" },
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
      filtered = filtered.filter((list) =>
        selectedCategories.includes(list.category || "Uncategorized")
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [initialLists, checklistFilter, selectedCategories, user?.pinnedLists]);

  const { currentPage, totalPages, paginatedItems, goToPage, totalItems, handleItemsPerPageChange } = usePagination({
    items: filteredLists,
    itemsPerPage,
    onItemsPerPageChange: setItemsPerPage,
  });

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleClearAllCategories = () => {
    setSelectedCategories([]);
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
    return (
      <div className="flex h-screen bg-background w-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (initialLists.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader
          title="All Checklists"
          description="Browse and manage all your checklists"
        />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <EmptyState
            icon={<Folder className="h-10 w-10 text-muted-foreground" />}
            title="No checklists yet"
            description="Create your first checklist to start organizing your tasks."
            buttonText="New Checklist"
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
          title="All Checklists"
          description="Browse and manage all your checklists"
        />
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Folder className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  {stats.totalLists}
                </div>
                <div className="text-xs text-muted-foreground">Lists</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  {stats.completedItems}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  {stats.completionRate}%
                </div>
                <div className="text-xs text-muted-foreground">Progress</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  {stats.totalItems}
                </div>
                <div className="text-xs text-muted-foreground">Total Items</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-8">
          <div className="lg:col-span-1">
            <FilterSidebar
              title="Filter by status"
              filterValue={checklistFilter}
              filterOptions={filterOptions}
              onFilterChange={(value) =>
                setChecklistFilter(value as ChecklistFilter)
              }
              categories={initialCategories}
              selectedCategories={selectedCategories}
              onCategoryToggle={handleCategoryToggle}
              onClearAllCategories={handleClearAllCategories}
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
                <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No checklists found
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters or create a new checklist.
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
                        const categoryPath = `${list.category || "Uncategorized"
                          }/${list.id}`;
                        router.push(`/checklist/${categoryPath}`);
                      }}
                      isPinned={user?.pinnedLists?.includes(
                        `${list.category || "Uncategorized"}/${list.id}`
                      )}
                      onTogglePin={() => { }}
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
