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
import { useSettings } from "@/app/_utils/settings-store";
import { ChecklistListItem } from "@/app/_components/GlobalComponents/Cards/ChecklistListItem";
import { ChecklistGridItem } from "@/app/_components/GlobalComponents/Cards/ChecklistGridItem";

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
  const { viewMode } = useSettings();

  const {
    sensors,
    handleDragStart,
    handleDragEnd,
    pinned,
    recent,
    taskLists,
    simpleLists,
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
          title={t('checklists.noChecklistsYet')}
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
              <span className="hidden sm:inline">{t('checklists.allLists')}</span>
              <span className="sm:hidden">{t('common.all')}</span>
            </Button>
            <Button
              onClick={() => onCreateModal()}
              size="sm"
              className="flex-1 sm:size-lg"
            >
              <Add01Icon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t('checklists.newChecklist')}</span>
              <span className="sm:hidden">{t('common.new')}</span>
            </Button>
          </div>
        </div>

        {pinned.length > 0 && (
          <div className="mb-8 lg:mb-12 overflow-hidden">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t('common.pinned')}</h2>
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
                {viewMode === 'card' && (
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
                )}

                {viewMode === 'list' && (
                  <div className="space-y-3">
                    {pinned.map((list) => (
                      <ChecklistListItem
                        key={`pinned-${list.category}-${list.uuid || list.id}`}
                        list={list}
                        onSelect={onSelectChecklist!}
                        isPinned={true}
                        onTogglePin={handleTogglePin}
                        sharer={getListSharer(list)}
                        isDraggable={true}
                      />
                    ))}
                  </div>
                )}

                {viewMode === 'grid' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {pinned.map((list) => (
                      <ChecklistGridItem
                        key={`pinned-${list.category}-${list.uuid || list.id}`}
                        list={list}
                        onSelect={onSelectChecklist!}
                        isPinned={true}
                        onTogglePin={handleTogglePin}
                        sharer={getListSharer(list)}
                        isDraggable={true}
                      />
                    ))}
                  </div>
                )}
              </SortableContext>

              <DragOverlay>
                {activeList ? (
                  <>
                    {viewMode === 'card' && (
                      <ChecklistCard
                        list={activeList}
                        onSelect={() => { }}
                        isPinned={true}
                        isDraggable={false}
                        sharer={getListSharer(activeList)}
                        fixedWidth={draggedItemWidth || undefined}
                      />
                    )}
                    {viewMode === 'list' && (
                      <ChecklistListItem
                        list={activeList}
                        onSelect={() => { }}
                        isPinned={true}
                        sharer={getListSharer(activeList)}
                      />
                    )}
                    {viewMode === 'grid' && (
                      <ChecklistGridItem
                        list={activeList}
                        onSelect={() => { }}
                        isPinned={true}
                        sharer={getListSharer(activeList)}
                      />
                    )}
                  </>
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
                    {t('tasks.recentTasks')}
                  </h2>
                  <div className="flex-1 h-px bg-border"></div>
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = "/tasks")}
                    size="sm"
                    className="ml-2"
                  >
                    <span className="hidden sm:inline">{t('tasks.showAllTasks')}</span>
                    <span className="sm:hidden">{t('common.all')}</span>
                    <ArrowRight04Icon className="h-4 w-4 ml-1 sm:ml-2" />
                  </Button>
                </div>
                {viewMode === 'card' && (
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
                )}

                {viewMode === 'list' && (
                  <div className="space-y-3">
                    {taskLists.map((list) => (
                      <ChecklistListItem
                        key={`task-${list.category}-${list.id}`}
                        list={list}
                        onSelect={onSelectChecklist!}
                        isPinned={isListPinned(list)}
                        onTogglePin={handleTogglePin}
                        sharer={getListSharer(list)}
                      />
                    ))}
                  </div>
                )}

                {viewMode === 'grid' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {taskLists.map((list) => (
                      <ChecklistGridItem
                        key={`task-${list.category}-${list.id}`}
                        list={list}
                        onSelect={onSelectChecklist!}
                        isPinned={isListPinned(list)}
                        onTogglePin={handleTogglePin}
                        sharer={getListSharer(list)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {simpleLists.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    {t('checklists.recent')}
                  </h2>
                  <div className="flex-1 h-px bg-border"></div>
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = "/checklists")}
                    size="sm"
                    className="ml-2"
                  >
                    <span className="hidden sm:inline">{t('common.showAll')}</span>
                    <span className="sm:hidden">{t('common.all')}</span>
                    <ArrowRight04Icon className="h-4 w-4 ml-1 sm:ml-2" />
                  </Button>
                </div>
                {viewMode === 'card' && (
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
                )}

                {viewMode === 'list' && (
                  <div className="space-y-3">
                    {simpleLists.map((list) => (
                      <ChecklistListItem
                        key={`simple-${list.category}-${list.id}`}
                        list={list}
                        onSelect={onSelectChecklist!}
                        isPinned={isListPinned(list)}
                        onTogglePin={handleTogglePin}
                        sharer={getListSharer(list)}
                      />
                    ))}
                  </div>
                )}

                {viewMode === 'grid' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {simpleLists.map((list) => (
                      <ChecklistGridItem
                        key={`simple-${list.category}-${list.id}`}
                        list={list}
                        onSelect={onSelectChecklist!}
                        isPinned={isListPinned(list)}
                        onTogglePin={handleTogglePin}
                        sharer={getListSharer(list)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
