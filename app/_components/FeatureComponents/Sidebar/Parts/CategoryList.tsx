"use client";

import { AppMode, Category, Checklist, Note } from "@/app/_types";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { setCategoryOrder } from "@/app/_server/actions/category";
import { CategoryRenderer } from "./CategoryRenderer";
import { Draggable } from "./Draggable";
import { Modes } from "@/app/_types/enums";

interface SharingStatus {
  isShared: boolean;
  isPubliclyShared: boolean;
  sharedWith: string[];
}

interface CategoryListProps {
  categories: Category[];
  items: (Checklist | Note)[];
  collapsedCategories: Set<string>;
  onToggleCategory: (categoryName: string) => void;
  onDeleteCategory: (categoryName: string) => void;
  onRenameCategory: (categoryName: string) => void;
  onQuickCreate: (categoryName: string) => void;
  onCreateSubcategory: (categoryPath: string) => void;
  onItemClick: (item: Checklist | Note) => void;
  onEditItem?: (item: Checklist | Note) => void;
  isItemSelected: (item: Checklist | Note) => boolean;
  mode: AppMode;
  getSharingStatus: (itemId: string) => SharingStatus | null;
  user?: any;
}

export const CategoryList = (props: CategoryListProps) => {
  const { categories, mode } = props;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  if (!categories || categories.length === 0) {
    return null;
  }

  const rootCategories = categories.filter((cat) => !cat.parent);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = rootCategories.map((c) => c.name);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(ids, oldIndex, newIndex);
    const formData = new FormData();
    formData.append(
      "type",
      mode === Modes.NOTES ? Modes.NOTES : Modes.CHECKLISTS
    );
    formData.append(
      "mode",
      mode === Modes.NOTES ? Modes.NOTES : Modes.CHECKLISTS
    );
    formData.append("parent", "");
    formData.append("categories", JSON.stringify(newOrder));
    await setCategoryOrder(formData);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={rootCategories.map((c) => c.name)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1">
          {rootCategories.map((category) => (
            <Draggable
              key={category.name}
              id={category.name}
              data={{ type: "category", parent: "" }}
            >
              <CategoryRenderer
                category={category}
                allCategories={categories}
                allItems={props.items}
                {...props}
              />
            </Draggable>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
