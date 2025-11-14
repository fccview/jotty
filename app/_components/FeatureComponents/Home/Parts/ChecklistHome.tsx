"use client";

import {
  CheckCircle,
  Folder,
  Plus,
  TrendingUp,
  Clock,
  BarChart3,
  CheckSquare,
  Pin,
  Filter,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Checklist, User } from "@/app/_types";
import { EmptyState } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import { ChecklistCard } from "@/app/_components/GlobalComponents/Cards/ChecklistCard";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useChecklistHome } from "@/app/_hooks/useChecklistHome";
import { useTranslations } from "next-intl";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { encodeCategoryPath } from "@/app/_utils/global-utils";

interface ChecklistHomeProps {
  lists: Checklist[];
  user: User | null;
  onCreateModal: () => void;
  onSelectChecklist?: (list: Checklist) => void;
}

export const ChecklistHome = ({
  lists,
  user,
  onCreateModal,
  onSelectChecklist,
}: ChecklistHomeProps) => {
  const { userSharedItems } = useAppMode();

  const {
    sensors,
    handleDragStart,
    handleDragEnd,
    pinned,
    recent,
    taskLists,
    simpleLists,
    stats,
    completionRate,
    filterOptions,
    checklistFilter,
    setChecklistFilter,
    handleTogglePin,
    isListPinned,
    activeList,
    draggedItemWidth,
  } = useChecklistHome({ lists, user });

  const t = useTranslations();
  const getListSharer = (list: Checklist) => {
    const encodedCategory = encodeCategoryPath(
      list.category || "Uncategorized"
    );
    const sharedItem = userSharedItems?.checklists?.find(
      (item) => item.id === list.id && item.category === encodedCategory
    );
    return sharedItem?.sharer;
  };

  if (lists.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          title={t("checklists.no_checklists_yet")}
          description={t("checklists.create_your_first_checklist")}
          buttonText={t("checklists.new_checklist")}
          onButtonClick={() => onCreateModal()}
          icon={<CheckSquare className="h-10 w-10 text-muted-foreground" />}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto hide-scrollbar bg-background pb-16 lg:pb-0">
      <div className="max-w-full pt-6 pb-4 px-4 lg:pt-8 lg:pb-8 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-foreground tracking-tight">
              {t("checklists.title")}
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
              {t("checklists.description")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/checklists")}
              size="sm"
              className="flex-1 sm:size-lg"
            >
              <span className="hidden sm:inline">
                {t("checklists.all_lists")}
              </span>
              <span className="sm:hidden">{t("global.all")}</span>
            </Button>
            <Button
              onClick={() => onCreateModal()}
              size="sm"
              className="flex-1 sm:size-lg"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">
                {t("checklists.new_checklist")}
              </span>
              <span className="sm:hidden">{t("global.new")}</span>
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-6 lg:mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Folder className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  {stats.totalLists}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("global.categories")}
                </div>
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
                <div className="text-xs text-muted-foreground">
                  {t("global.completed")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  {completionRate}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("global.progress")}
                </div>
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
                <div className="text-xs text-muted-foreground">
                  {t("global.total_items")}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">
              {t("actions.filter_by_completion")}
            </span>
          </div>
          <Dropdown
            value={checklistFilter}
            options={filterOptions}
            onChange={(value) => setChecklistFilter(value as any)}
            className="w-full sm:w-48"
          />
        </div>

        {pinned.length > 0 && (
          <div className="mb-8 lg:mb-12 overflow-hidden">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Pin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                {t("global.pinned")}
              </h2>
              <div className="flex-1 h-px bg-border"></div>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={pinned.map((list) => list.uuid || list.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pinned.map((list) => (
                    <ChecklistCard
                      key={`pinned-${list.category}-${list.uuid || list.id}`}
                      list={list}
                      onSelect={onSelectChecklist!}
                      isPinned={true}
                      onTogglePin={handleTogglePin}
                      isDraggable={true}
                      sharer={getListSharer(list)}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeList ? (
                  <ChecklistCard
                    list={activeList}
                    onSelect={() => {}}
                    isPinned={true}
                    isDraggable={false}
                    sharer={getListSharer(activeList)}
                    fixedWidth={draggedItemWidth || undefined}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}

        {recent.length > 0 && (
          <div className="space-y-6 sm:space-y-8">
            {taskLists.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    {t("tasks.task_lists")}
                  </h2>
                  <div className="flex-1 h-px bg-border"></div>
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = "/tasks")}
                    size="sm"
                    className="ml-2"
                  >
                    <span className="hidden sm:inline">
                      {t("tasks.all_tasks")}
                    </span>
                    <span className="sm:hidden">{t("global.all")}</span>
                    <ArrowRight className="h-4 w-4 ml-1 sm:ml-2" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {taskLists.map((list) => (
                    <ChecklistCard
                      key={`task-${list.category}-${list.id}`}
                      list={list}
                      onSelect={onSelectChecklist!}
                      isPinned={isListPinned(list)}
                      onTogglePin={handleTogglePin}
                      sharer={getListSharer(list)}
                    />
                  ))}
                </div>
              </div>
            )}

            {simpleLists.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    {t("checklists.simple_lists")}
                  </h2>
                  <div className="flex-1 h-px bg-border"></div>
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = "/checklists")}
                    size="sm"
                    className="ml-2"
                  >
                    <span className="hidden sm:inline">
                      {t("checklists.all_lists")}
                    </span>
                    <span className="sm:hidden">{t("global.all")}</span>
                    <ArrowRight className="h-4 w-4 ml-1 sm:ml-2" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {simpleLists.map((list) => (
                    <ChecklistCard
                      key={`simple-${list.category}-${list.id}`}
                      list={list}
                      onSelect={onSelectChecklist!}
                      isPinned={isListPinned(list)}
                      onTogglePin={handleTogglePin}
                      sharer={getListSharer(list)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
