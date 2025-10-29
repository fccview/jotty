"use client";

import { useState, useEffect, useRef } from "react";
import { ListTodo } from "lucide-react";
import { Checklist, ChecklistType, Category } from "@/app/_types";
import { createCategory } from "@/app/_server/actions/category";
import { createList } from "@/app/_server/actions/checklist";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { CategoryInput } from "@/app/_components/GlobalComponents/FormElements/CategoryInput";
import { ChecklistTypeSelector } from "../../../FeatureComponents/Checklists/Parts/ChecklistTypeSelector";
import { Modes } from "@/app/_types/enums";
import { ARCHIVED_DIR_NAME, EXCLUDED_DIRS } from "@/app/_consts/files";

interface CreateListModalProps {
  onClose: () => void;
  onCreated: (checklist?: Checklist) => void;
  categories: Category[];
  initialCategory?: string;
}

export const CreateListModal = ({
  onClose,
  onCreated,
  categories,
  initialCategory = "",
}: CreateListModalProps) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [type, setType] = useState<ChecklistType>("simple");
  const [isLoading, setIsLoading] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const notAllowedNames = [...EXCLUDED_DIRS, ARCHIVED_DIR_NAME];

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      let finalCategoryPath = category || "";
      if (showNewCategory && newCategory.trim()) {
        const newCatTrimmed = newCategory.trim();
        const categoryFormData = new FormData();
        categoryFormData.append("name", newCatTrimmed);
        categoryFormData.append("mode", Modes.CHECKLISTS);
        if (category) {
          categoryFormData.append("parent", category);
        }
        await createCategory(categoryFormData);
        finalCategoryPath = category
          ? `${category}/${newCatTrimmed}`
          : newCatTrimmed;
      }

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("category", finalCategoryPath);
      formData.append("type", type);
      const result = await createList(formData);

      if (result.success) onCreated(result.data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowNewCategory = (show: boolean) => {
    setShowNewCategory(show);
    if (!show) setNewCategory("");
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Create New Checklist"
      titleIcon={<ListTodo className="h-5 w-5 text-primary" />}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Checklist Name *
          </label>
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter checklist name..."
            className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            required
            disabled={isLoading}
          />
        </div>

        <ChecklistTypeSelector
          selectedType={type}
          onTypeChange={setType}
          disabled={isLoading}
        />

        <CategoryInput
          categories={categories}
          selectedCategory={category}
          onCategoryChange={setCategory}
          newCategory={newCategory}
          onNewCategoryChange={setNewCategory}
          showNewCategory={showNewCategory}
          onShowNewCategoryChange={handleShowNewCategory}
          disabled={isLoading}
        />

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              isLoading ||
              !title.trim() ||
              notAllowedNames.includes(newCategory?.trim()?.toLowerCase())
            }
            className="flex-1"
          >
            {isLoading ? "Creating..." : "Create Checklist"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
