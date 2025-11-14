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
import { ChecklistDropIndicator } from "./ChecklistDropIndicator";
import { Checklist, Item } from "@/app/_types";
import { TaskStatusLabels, ItemTypes } from "@/app/_types/enums";
import { useMemo, useState } from "react";
import { getReferences } from "@/app/_utils/indexes-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { ReferencedBySection } from "@/app/_components/FeatureComponents/Notes/Parts/ReferencedBySection";
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
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const t = useTranslations();
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

  if (localList.items.length === 0) {
    return (
      <>
        <div className="bg-card rounded-lg border border-border m-4 p-8 text-center">
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {t("checklists.no_items_yet")}
          </h3>
          <p className="text-muted-foreground">
            {t("checklists.add_first_item")}
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
          onDragStart={(event) => {
            setIsDragging(true);
            const item = [...incompleteItems, ...completedItems].find(
              (item) => item.id === event.active.id
            );
            setActiveItem(item || null);
            handleDragStart?.(event);
          }}
          onDragEnd={(event) => {
            setIsDragging(false);
            handleDragEnd(event);
          }}
        >
          <div className="w-full space-y-4 overflow-hidden">
            {incompleteItems.length > 0 && (
              <ChecklistItemsWrapper
                title={TaskStatusLabels.TODO}
                count={incompleteItems.length}
                onBulkToggle={() => handleBulkToggle(true)}
                isLoading={isLoading}
              >
                <ChecklistDropIndicator
                  id="drop-todo-start"
                  data={{
                    type: "drop-indicator",
                    parentPath: "todo",
                    position: "before",
                    targetDndId: incompleteItems[0]?.id,
                    targetType: "item",
                  }}
                />
                {false && incompleteItems.length >= 50 ? (
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
                      <ChecklistDropIndicator
                        id={`drop-todo-after-${item.id}`}
                        data={{
                          type: "drop-indicator",
                          parentPath: "todo",
                          position: "after",
                          targetDndId: item.id,
                          targetType: "item",
                        }}
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
                isLoading={isLoading}
                isCompleted
              >
                <ChecklistDropIndicator
                  id="drop-completed-start"
                  data={{
                    type: "drop-indicator",
                    parentPath: "completed",
                    position: "before",
                    targetDndId: completedItems[0]?.id,
                    targetType: "item",
                  }}
                />
                {false && completedItems.length >= 50 ? (
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
                      <ChecklistDropIndicator
                        id={`drop-completed-after-${item.id}`}
                        data={{
                          type: "drop-indicator",
                          parentPath: "completed",
                          position: "after",
                          targetDndId: item.id,
                          targetType: "item",
                        }}
                      />
                    </div>
                  ))
                )}
              </ChecklistItemsWrapper>
            )}
          </div>
          <DragOverlay>
            {activeItem ? (
              <div className="pointer-events-none w-full opacity-0">
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
