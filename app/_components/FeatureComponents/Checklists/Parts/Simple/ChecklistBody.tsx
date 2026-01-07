import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
  DragOverEvent,
} from "@dnd-kit/core";
import { ChecklistProgress } from "./ChecklistProgress";
import { ChecklistItemsWrapper } from "./ChecklistItemsWrapper";
import { NestedChecklistItem } from "@/app/_components/FeatureComponents/Checklists/Parts/Simple/NestedChecklistItem";
import VirtualizedChecklistItems from "./VirtualizedChecklistItems";
import { Checklist, Item } from "@/app/_types";
import { ItemTypes, TaskStatusLabels } from "@/app/_types/enums";
import { useMemo, useState } from "react";
import { getReferences } from "@/app/_utils/indexes-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { ReferencedBySection } from "@/app/_components/FeatureComponents/Notes/Parts/ReferencedBySection";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";

interface ChecklistBodyProps {
  localList: Checklist;
  incompleteItems: Item[];
  completedItems: Item[];
  handleToggleItem: (itemId: string, completed: boolean) => void;
  handleDeleteItem: (itemId: string) => void;
  handleEditItem: (itemId: string, text: string) => void;
  handleAddSubItem: (parentId: string, text: string) => void;
  handleBulkToggle: (completed: boolean) => void;
  handleClearAll: (type: "completed" | "incomplete") => void;
  handleDragEnd: (event: DragEndEvent) => void;
  sensors: any;
  isLoading: boolean;
  isDeletingItem: boolean;
}

export const ChecklistBody = ({
  localList,
  incompleteItems,
  completedItems,
  handleToggleItem,
  handleDeleteItem,
  handleEditItem,
  handleAddSubItem,
  handleBulkToggle,
  handleClearAll,
  handleDragEnd,
  sensors,
  isLoading,
  isDeletingItem,
}: ChecklistBodyProps) => {
  const t = useTranslations();
  const { linkIndex, notes, checklists, appSettings } = useAppMode();
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [overItem, setOverItem] = useState<{
    id: string;
    position: "before" | "after";
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const referencingItems = useMemo(() => {
    return getReferences(
      linkIndex,
      localList.uuid,
      localList.category,
      ItemTypes.CHECKLIST,
      notes,
      checklists
    );
  }, [linkIndex, localList.uuid, localList.category, notes, checklists]);

  const items = useMemo(() => {
    const flattenItems = (items: Item[]): string[] => {
      return items.reduce<string[]>((acc, item) => {
        acc.push(item.id);
        if (item.children && item.children.length > 0) {
          acc.push(...flattenItems(item.children));
        }
        return acc;
      }, []);
    };
    return flattenItems(localList.items);
  }, [localList.items]);

  const onDragStart = (event: DragStartEvent) => {
    const findItem = (items: Item[], id: string): Item | undefined => {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
          const found = findItem(item.children, id);
          if (found) return found;
        }
      }
      return undefined;
    };

    const item = findItem(localList.items, event.active.id.toString());
    setActiveItem(item || null);
    setIsDragging(true);
  };

  const onDragEnd = (event: DragEndEvent) => {
    handleDragEnd(event);
    setActiveItem(null);
    setOverItem(null);
    setIsDragging(false);
  };

  const onDragCancel = () => {
    setActiveItem(null);
    setOverItem(null);
    setIsDragging(false);
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setOverItem(null);
      return;
    }

    const overId = over.id;
    const isDraggingUp = event.delta.y < 0;

    setOverItem({
      id: overId.toString(),
      position: isDraggingUp ? "before" : "after",
    });
  };

  if (localList.items.length === 0) {
    return (
      <>
        <div className="bg-card rounded-jotty border border-border m-4 p-8 text-center">
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {t('checklists.noItemsYet')}
          </h3>
          <p className="text-muted-foreground">
            {t('checklists.addFirstItem')}
          </p>
        </div>

        {referencingItems.length > 0 &&
          appSettings?.editor?.enableBilateralLinks && (
            <div className="p-4">
              <ReferencedBySection referencingItems={referencingItems} />
            </div>
          )}
      </>
    );
  }

  return (
    <>
      {localList.items.length > 0 && (
        <ChecklistProgress checklist={localList} />
      )}
      <div className="flex-1 overflow-y-auto jotty-scrollable-content p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
          onDragOver={onDragOver}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div className="w-full min-h-[200px] space-y-4 overflow-hidden checklist-todo-container">
              {incompleteItems.length > 0 && (
                <ChecklistItemsWrapper
                  title={TaskStatusLabels.TODO}
                  count={incompleteItems.length}
                  onBulkToggle={() => handleBulkToggle(true)}
                  onClearAll={() => handleClearAll("incomplete")}
                  isLoading={isLoading}
                >
                  {incompleteItems.length >= 50 ? (
                    <VirtualizedChecklistItems
                      items={incompleteItems}
                      onToggle={handleToggleItem}
                      onDelete={handleDeleteItem}
                      onEdit={handleEditItem}
                      onAddSubItem={handleAddSubItem}
                      isDeletingItem={isDeletingItem}
                      checklist={localList}
                      isAnyItemDragging={isDragging}
                      overItem={overItem}
                    />
                  ) : (
                    incompleteItems.map((item, index) => (
                      <div key={item.id}>
                        <NestedChecklistItem
                          key={item.id}
                          item={item}
                          index={index.toString()}
                          level={0}
                          onToggle={handleToggleItem}
                          onDelete={handleDeleteItem}
                          onEdit={handleEditItem}
                          onAddSubItem={handleAddSubItem}
                          isDeletingItem={isDeletingItem}
                          isDragDisabled={false}
                          checklist={localList}
                          isOver={overItem?.id === item.id}
                          overPosition={
                            overItem?.id === item.id
                              ? overItem.position
                              : undefined
                          }
                          isAnyItemDragging={isDragging}
                          overItem={overItem}
                        />
                      </div>
                    ))
                  )}
                </ChecklistItemsWrapper>
              )}
              {completedItems.length > 0 && (
                <ChecklistItemsWrapper
                  title={TaskStatusLabels.COMPLETED}
                  count={completedItems.length}
                  onBulkToggle={() => handleBulkToggle(false)}
                  onClearAll={() => handleClearAll("completed")}
                  isLoading={isLoading}
                  isCompleted
                >
                  {completedItems.length >= 50 ? (
                    <VirtualizedChecklistItems
                      items={completedItems}
                      onToggle={handleToggleItem}
                      onDelete={handleDeleteItem}
                      onEdit={handleEditItem}
                      onAddSubItem={handleAddSubItem}
                      isDeletingItem={isDeletingItem}
                      checklist={localList}
                      isAnyItemDragging={isDragging}
                      overItem={overItem}
                    />
                  ) : (
                    completedItems.map((item, index) => (
                      <div key={item.id}>
                        <NestedChecklistItem
                          key={item.id}
                          item={item}
                          index={(incompleteItems.length + index).toString()}
                          level={0}
                          onToggle={handleToggleItem}
                          onDelete={handleDeleteItem}
                          onEdit={handleEditItem}
                          onAddSubItem={handleAddSubItem}
                          completed
                          isDeletingItem={isDeletingItem}
                          isDragDisabled={false}
                          checklist={localList}
                          isOver={overItem?.id === item.id}
                          overPosition={
                            overItem?.id === item.id
                              ? overItem.position
                              : undefined
                          }
                          isAnyItemDragging={isDragging}
                          overItem={overItem}
                        />
                      </div>
                    ))
                  )}
                </ChecklistItemsWrapper>
              )}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeItem ? (
              <div className="pointer-events-none w-full opacity-50">
                <NestedChecklistItem
                  item={activeItem}
                  index={0}
                  level={0}
                  onToggle={() => { }}
                  onDelete={() => { }}
                  onEdit={() => { }}
                  onAddSubItem={() => { }}
                  isDeletingItem={false}
                  isDragDisabled={true}
                  checklist={localList}
                  completed={activeItem.completed}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {referencingItems.length > 0 &&
          appSettings?.editor?.enableBilateralLinks && (
            <ReferencedBySection referencingItems={referencingItems} />
          )}
      </div>
    </>
  );
};
