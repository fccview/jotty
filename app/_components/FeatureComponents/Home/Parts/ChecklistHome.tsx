"use client";

import {
  Add01Icon,
  CheckmarkSquare04Icon,
  ArrowRight04Icon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Checklist, User } from "@/app/_types";
import { EmptyState } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import { ChecklistCard } from "@/app/_components/GlobalComponents/Cards/ChecklistCard";
import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useChecklistHome } from "@/app/_hooks/useChecklistHome";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { encodeCategoryPath } from "@/app/_utils/global-utils";
import { useTranslations } from "next-intl";

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
  const t = useTranslations();
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
    handleTogglePin,
    isListPinned,
    activeList,
    draggedItemWidth,
  } = useChecklistHome({ lists, user });

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
          title="No Checklists Yet"
          description={t('checklists.createFirstChecklist')}
          buttonText={t('checklists.newChecklist')}
          onButtonClick={() => onCreateModal()}
          icon={
            <CheckmarkSquare04Icon className="h-10 w-10 text-muted-foreground" />
          }
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto hide-scrollbar bg-background pb-16 lg:pb-0">
      <div className="max-w-full pt-6 pb-4 px-4 lg:pt-8 lg:pb-8 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-foreground tracking-tight">{t('checklists.title')}</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/checklists")}
              size="sm"
              className="flex-1 sm:size-lg"
            >
              <span className="hidden sm:inline">All Lists</span>
              <span className="sm:hidden">All</span>
            </Button>
            <Button
              onClick={() => onCreateModal()}
              size="sm"
              className="flex-1 sm:size-lg"
            >
              <Add01Icon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t('checklists.newChecklist')}</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        {pinned.length > 0 && (
          <div className="mb-8 lg:mb-12 overflow-hidden">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t('notes.pinned')}</h2>
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
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    Recent Tasks
                  </h2>
                  <div className="flex-1 h-px bg-border"></div>
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = "/tasks")}
                    size="sm"
                    className="ml-2"
                  >
                    <span className="hidden sm:inline">Show All Tasks</span>
                    <span className="sm:hidden">All</span>
                    <ArrowRight04Icon className="h-4 w-4 ml-1 sm:ml-2" />
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
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    Recent Checklists
                  </h2>
                  <div className="flex-1 h-px bg-border"></div>
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = "/checklists")}
                    size="sm"
                    className="ml-2"
                  >
                    <span className="hidden sm:inline">Show All</span>
                    <span className="sm:hidden">All</span>
                    <ArrowRight04Icon className="h-4 w-4 ml-1 sm:ml-2" />
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
