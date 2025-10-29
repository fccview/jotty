import { Plus } from "lucide-react";
import { Button } from "../Buttons/Button";
import { CategoryTreeSelector } from "../Dropdowns/CategoryTreeSelector";
import { Category } from "@/app/_types";
import { ARCHIVED_DIR_NAME, EXCLUDED_DIRS } from "@/app/_consts/files";

interface CategoryInputProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  newCategory: string;
  onNewCategoryChange: (category: string) => void;
  showNewCategory: boolean;
  onShowNewCategoryChange: (show: boolean) => void;
  disabled: boolean;
}

export const CategoryInput = ({
  categories,
  selectedCategory,
  onCategoryChange,
  newCategory,
  onNewCategoryChange,
  showNewCategory,
  onShowNewCategoryChange,
  disabled,
}: CategoryInputProps) => {
  const selectedCategoryName = selectedCategory
    ? categories.find((c) => c.path === selectedCategory)?.name ||
      selectedCategory
    : "Root level";

  const notAllowedNames = [...EXCLUDED_DIRS, ARCHIVED_DIR_NAME];
  const isNotAllowedName = notAllowedNames.includes(
    newCategory?.trim()?.toLowerCase()
  );

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        Category
      </label>
      {showNewCategory ? (
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => onNewCategoryChange(e.target.value)}
              className="flex-1 px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter new category name..."
              disabled={disabled}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => onShowNewCategoryChange(false)}
              disabled={disabled}
            >
              Cancel
            </Button>
          </div>
          {isNotAllowedName && (
            <div className="text-xs text-destructive  ">
              {newCategory} is not allowed. Please choose a different name.
            </div>
          )}
          {!isNotAllowedName && (
            <div className="text-xs text-muted-foreground">
              New category will be created in:{" "}
              <strong>{selectedCategoryName}</strong>
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <CategoryTreeSelector
            categories={categories}
            selectedCategory={selectedCategory}
            onCategorySelect={onCategoryChange}
            className="flex-1"
            isInModal
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => onShowNewCategoryChange(true)}
            className="px-3"
            disabled={disabled}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
