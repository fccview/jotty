import { Add01Icon } from "hugeicons-react";
import { Button } from "../Buttons/Button";
import { CategoryTreeSelector } from "../Dropdowns/CategoryTreeSelector";
import { Category } from "@/app/_types";
import { ARCHIVED_DIR_NAME, EXCLUDED_DIRS } from "@/app/_consts/files";
import { useTranslations } from "next-intl";

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
  const t = useTranslations();
  const selectedCategoryName = selectedCategory
    ? categories.find((c) => c.path === selectedCategory)?.name ||
    selectedCategory
    : t('common.rootLevel');

  const notAllowedNames = [...EXCLUDED_DIRS, ARCHIVED_DIR_NAME];
  const isNotAllowedName = notAllowedNames.includes(
    newCategory?.trim()?.toLowerCase()
  );

  return (
    <div>
      <label className="block text-md lg:text-sm font-medium text-foreground mb-2">{t('notes.category')}</label>
      {showNewCategory ? (
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => onNewCategoryChange(e.target.value)}
              className="flex-1 px-3 py-2 bg-background border border-input rounded-jotty focus:outline-none focus:ring-none focus:ring-ring"
              placeholder={t('common.categoryNamePlaceholder')}
              disabled={disabled}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => onShowNewCategoryChange(false)}
              disabled={disabled}
            >{t('common.cancel')}</Button>
          </div>
          {isNotAllowedName && (
            <div className="text-md lg:text-sm lg:text-xs text-destructive">
              {t('common.notAllowedName', { name: newCategory })}
            </div>
          )}
          {!isNotAllowedName && (
            <div className="text-md lg:text-sm lg:text-xs text-muted-foreground">
              {t('common.categoryWillBeCreatedIn')}{" "}
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
            placeholder={t('common.selectCategory')}
            isInModal
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => onShowNewCategoryChange(true)}
            className="px-3"
            disabled={disabled}
          >
            <Add01Icon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
