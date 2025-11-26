import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
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
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

interface ChecklistBodyProps {
  localList: Checklist;
  incompleteItems: Item[];
  completedItems: Item[];
  handleToggleItem: (itemId: string, completed: boolean) => void;
  handleDeleteItem: (itemId: string) => void;
  handleEditItem: (itemId: string, text: string) => void;
  handleAddSubItem: (parentId: string, text: string) => void;
  handleBulkToggle: (completed: boolean) => void;
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
  handleDragEnd,
  sensors,
  isLoading,
  isDeletingItem,
}: ChecklistBodyProps) => {
  const { linkIndex, notes, checklists, appSettings } = useAppMode();
  const [activeItem, setActiveItem] = useState<Item | null>(null);

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
    return localList.items.map((item) => item.id);
  }, [localList.items]);

  const onDragStart = (event: DragStartEvent) => {
    const item = localList.items.find((item) => item.id === event.active.id);
    setActiveItem(item || null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    handleDragEnd(event);
    setActiveItem(null);
  };

  const onDragCancel = () => {
    setActiveItem(null);
  };

  if (localList.items.length === 0) {
    return (
      <>
        <div className="bg-card rounded-lg border border-border m-4 p-8 text-center">
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No items yet
          </h3>
          <p className="text-muted-foreground">
            Add your first item to get started!
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
      <div className="flex-1 overflow-y-auto p-4 pb-24 lg:pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div className="w-full space-y-4 overflow-hidden">
              {incompleteItems.length > 0 && (
                <ChecklistItemsWrapper
                  title={TaskStatusLabels.TODO}
                  count={incompleteItems.length}
                  onBulkToggle={() => handleBulkToggle(true)}
                  isLoading={isLoading}
                >
                  {incompleteItems.map((item, index) => (
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
                      />
                    </div>
                  ))}
                </ChecklistItemsWrapper>
              )}
              {completedItems.length > 0 && (
                <ChecklistItemsWrapper
                  title={TaskStatusLabels.COMPLETED}
                  count={completedItems.length}
                  onBulkToggle={() => handleBulkToggle(false)}
                  isLoading={isLoading}
                  isCompleted
                >
                  {completedItems.map((item, index) => (
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
                      />
                    </div>
                  ))}
                </ChecklistItemsWrapper>
              )}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeItem ? (
              <NestedChecklistItem
                item={activeItem}
                index={0}
                level={0}
                onToggle={() => {}}
                onDelete={() => {}}
                onEdit={() => {}}
                onAddSubItem={() => {}}
                isDeletingItem={false}
                isDragDisabled={true}
                checklist={localList}
                completed={activeItem.completed}
              />
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
