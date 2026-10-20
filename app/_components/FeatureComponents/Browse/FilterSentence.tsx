"use client";

import { useTranslations } from "next-intl";
import { Category } from "@/app/_types";
import { BROWSE_SORTS, BrowseScope, BrowseSort } from "@/app/_consts/browse";
import { categoryLeaf } from "@/app/_utils/category-path-utils";
import { cn } from "@/app/_utils/global-utils";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { Popover } from "@/app/_components/GlobalComponents/Dropdowns/Popover";
import { CategoryFilter } from "./CategoryFilter";
import { SENTENCE_FONT, SentenceWord } from "./SentenceWord";

const VISIBLE_CATEGORY_NAMES = 2;

interface FilterCountProps<F extends string> {
  filter: F;
  countFor: (filter: F) => number;
}

const FilterCount = <F extends string>({ filter, countFor }: FilterCountProps<F>) => (
  <span className="font-mono text-xs text-muted-foreground">{countFor(filter)}</span>
);

interface FilterSentenceProps<F extends string> {
  scope: BrowseScope;
  filters: readonly F[];
  filter: F;
  defaultFilter: F;
  onFilter: (filter: F) => void;
  countFor: (filter: F) => number;
  categories: Category[];
  selected: string[];
  recursive: boolean;
  onToggleCategory: (path: string) => void;
  onRecursive: (recursive: boolean) => void;
  onClearCategories: () => void;
  sort: BrowseSort;
  onSort: (sort: BrowseSort) => void;
}

export const FilterSentence = <F extends string>({
  scope,
  filters,
  filter,
  defaultFilter,
  onFilter,
  countFor,
  categories,
  selected,
  recursive,
  onToggleCategory,
  onRecursive,
  onClearCategories,
  sort,
  onSort,
}: FilterSentenceProps<F>) => {
  const t = useTranslations();
  const fallback = t("notes.uncategorized");
  const filterLabel = (value: F) => {
    const key: string = `browse.filters.${scope}.${value}`;
    return t(key);
  };

  const categoryLabel = !selected.length
    ? t("browse.everyCategory")
    : selected.length > VISIBLE_CATEGORY_NAMES
      ? t("browse.categoriesMore", {
          first: categoryLeaf(selected[0], fallback),
          count: selected.length - 1,
        })
      : selected.length === VISIBLE_CATEGORY_NAMES
        ? t("browse.categoriesPair", {
            first: categoryLeaf(selected[0], fallback),
            second: categoryLeaf(selected[1], fallback),
          })
        : categoryLeaf(selected[0], fallback);

  return (
    <div
      className={cn(
        "jotty-filter-sentence text-xl sm:text-2xl leading-[1.9] text-muted-foreground",
        SENTENCE_FONT,
      )}
    >
      {t.rich("browse.sentence", {
        type: () => (
          <Dropdown
            className="inline-block"
            value={filter}
            onChange={(value) => onFilter(value as F)}
            options={filters.map((value) => ({
              id: value,
              name: <span className="inline-block first-letter:uppercase">{filterLabel(value)}</span>,
              meta: <FilterCount filter={value} countFor={countFor} />,
            }))}
            trigger={({ isOpen, toggle }) => (
              <SentenceWord isOpen={isOpen} isSet={filter !== defaultFilter} onClick={toggle}>
                {filterLabel(filter)}
              </SentenceWord>
            )}
          />
        ),
        category: () => (
          <Popover
            className="inline-block"
            menuClassName="p-2 w-[min(300px,80vw)] text-sm leading-5 font-normal"
            trigger={({ isOpen, toggle }) => (
              <SentenceWord isOpen={isOpen} isSet={selected.length > 0} onClick={toggle}>
                {categoryLabel}
              </SentenceWord>
            )}
          >
            {() => (
              <CategoryFilter
                categories={categories}
                selected={selected}
                recursive={recursive}
                onToggle={onToggleCategory}
                onRecursive={onRecursive}
                onClear={onClearCategories}
                inMenu
              />
            )}
          </Popover>
        ),
        scope: () =>
          selected.length ? (
            <span className={SENTENCE_FONT}>
              {recursive ? t("browse.andInside") : t("browse.only")}
            </span>
          ) : null,
        sort: () => (
          <Dropdown
            className="inline-block"
            value={sort}
            onChange={(value) => onSort(value as BrowseSort)}
            options={BROWSE_SORTS.map((value) => ({
              id: value,
              name: <span className="inline-block first-letter:uppercase">{t(`browse.sorts.${value}`)}</span>,
            }))}
            trigger={({ isOpen, toggle }) => (
              <SentenceWord isOpen={isOpen} isSet={sort !== BrowseSort.UPDATED} onClick={toggle}>
                {t(`browse.sorts.${sort}`)}
              </SentenceWord>
            )}
          />
        ),
      })}
    </div>
  );
};
