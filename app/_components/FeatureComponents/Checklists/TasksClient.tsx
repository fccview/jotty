"use client";

import { createContext, useContext, useState } from "react";
import { Layout } from "@/app/_components/GlobalComponents/Layout/Layout";
import { FiltersSidebar } from "@/app/_components/FeatureComponents/Sidebar/FiltersSidebar";
import { Category, SanitisedUser } from "@/app/_types";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { useTranslations } from "next-intl";

interface TasksClientProps {
    categories: Category[];
    user: SanitisedUser | null;
    children: React.ReactNode;
}

type TaskFilter = "all" | "completed" | "incomplete" | "pinned" | "todo" | "in-progress";

interface TasksFilterContextType {
    taskFilter: TaskFilter;
    setTaskFilter: (value: TaskFilter) => void;
    selectedCategories: string[];
    setSelectedCategories: (categories: string[]) => void;
    recursive: boolean;
    setRecursive: (recursive: boolean) => void;
    itemsPerPage: number;
    setItemsPerPage: (items: number) => void;
    paginationInfo: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        onPageChange: (page: number) => void;
        onItemsPerPageChange: (items: number) => void;
    } | null;
    setPaginationInfo: (info: TasksFilterContextType['paginationInfo']) => void;
}

const TasksFilterContext = createContext<TasksFilterContextType | null>(null);

export const useTasksFilter = () => {
    const context = useContext(TasksFilterContext);
    if (!context) {
        throw new Error("useTasksFilter must be used within TasksClient");
    }
    return context;
};

export const TasksClient = ({
    categories,
    user,
    children,
}: TasksClientProps) => {
    const t = useTranslations();
    const { openSettings, openCreateChecklistModal, openCreateCategoryModal } = useShortcut();

    const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [recursive, setRecursive] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(12);
    const [paginationInfo, setPaginationInfo] = useState<TasksFilterContextType['paginationInfo']>(null);

    const filterOptions = [
        { id: "all", name: t('tasks.allTasks') },
        { id: "completed", name: t('tasks.completed') },
        { id: "incomplete", name: t('checklists.incomplete') },
        { id: "pinned", name: t('common.pinned') },
        { id: "todo", name: t('tasks.todo') },
        { id: "in-progress", name: t('tasks.inProgress') },
    ];

    const handleClearAllCategories = () => {
        setSelectedCategories([]);
    };

    return (
        <TasksFilterContext.Provider
            value={{
                taskFilter,
                setTaskFilter,
                selectedCategories,
                setSelectedCategories,
                recursive,
                setRecursive,
                itemsPerPage,
                setItemsPerPage,
                paginationInfo,
                setPaginationInfo,
            }}
        >
            <Layout
                categories={categories}
                onOpenSettings={openSettings}
                onOpenCreateModal={openCreateChecklistModal}
                onOpenCategoryModal={openCreateCategoryModal}
                user={user}
                customSidebar={({ isOpen, onClose }) => (
                    <FiltersSidebar
                        isOpen={isOpen}
                        onClose={onClose}
                        title={t('checklists.byStatus')}
                        filterValue={taskFilter}
                        filterOptions={filterOptions}
                        onFilterChange={(value) => {
                            setTaskFilter(value as TaskFilter);
                        }}
                        categories={categories}
                        selectedCategories={selectedCategories}
                        onCategorySelectionChange={setSelectedCategories}
                        onClearAllCategories={handleClearAllCategories}
                        recursive={recursive}
                        onRecursiveChange={setRecursive}
                        currentPage={paginationInfo?.currentPage}
                        totalPages={paginationInfo?.totalPages}
                        onPageChange={paginationInfo?.onPageChange}
                        itemsPerPage={paginationInfo?.totalItems !== undefined ? itemsPerPage : undefined}
                        onItemsPerPageChange={paginationInfo?.onItemsPerPageChange}
                        totalItems={paginationInfo?.totalItems}
                    />
                )}
            >
                <div className="w-full px-4 py-6 h-full overflow-y-auto">
                    {children}
                </div>
            </Layout>
        </TasksFilterContext.Provider>
    );
};
