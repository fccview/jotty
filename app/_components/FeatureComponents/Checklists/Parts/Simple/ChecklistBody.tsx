import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
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
  handleDragStart?: (event: DragStartEvent) => void;
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
  handleDragStart,
  sensors,
  isLoading,
  isDeletingItem,
}: ChecklistBodyProps) => {
  const { linkIndex, notes, checklists, appSettings } = useAppMode();
  const [isDragging, setIsDragging] = useState(false);

  const referencingItems = useMemo(() => {
    return getReferences(
      linkIndex,
      localList.id,
      localList.category,
      ItemTypes.CHECKLIST,
      notes,
      checklists
    );
  }, [linkIndex, localList.id, localList.category, notes, checklists]);

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
          collisionDetection={closestCenter}
          onDragStart={(event) => {
            setIsDragging(true);
            handleDragStart?.(event);
          }}
          onDragEnd={(event) => {
            setIsDragging(false);
            handleDragEnd(event);
          }}
        >
          <SortableContext
            items={localList.items.flatMap((item) => [
              item.id,
              ...(item.children?.map((child) => child.id) || []),
            ])}
            strategy={verticalListSortingStrategy}
          >
            <div className="w-full space-y-4">
              {incompleteItems.length > 0 && (
                <ChecklistItemsWrapper
                  title={TaskStatusLabels.TODO}
                  count={incompleteItems.length}
                  onBulkToggle={() => handleBulkToggle(true)}
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
                      isDragging={isDragging}
                    />
                  ) : (
                    incompleteItems.map((item, index) => (
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
                    ))
                  )}
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
                  {completedItems.length >= 50 ? (
                    <VirtualizedChecklistItems
                      items={completedItems}
                      onToggle={handleToggleItem}
                      onDelete={handleDeleteItem}
                      onEdit={handleEditItem}
                      onAddSubItem={handleAddSubItem}
                      isDeletingItem={isDeletingItem}
                      checklist={localList}
                      isDragging={isDragging}
                    />
                  ) : (
                    completedItems.map((item, index) => (
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
                    ))
                  )}
                </ChecklistItemsWrapper>
              )}
            </div>
          </SortableContext>
        </DndContext>

        {referencingItems.length > 0 &&
          appSettings?.editor?.enableBilateralLinks && (
            <ReferencedBySection referencingItems={referencingItems} />
          )}
      </div>
    </>
  );
};
