"use client";

import { useTranslations } from "next-intl";
import { Category } from "@/app/_types";
import { BrowseScope, BrowseSort } from "@/app/_consts/browse";
import { BrowseControls } from "@/app/_hooks/useServerBrowse";
import { FilterSentence } from "./FilterSentence";
import { FilterChips } from "./FilterChips";

type BrowseState<F extends string> = Pick<
  BrowseControls<F>,
  | "filter"
  | "setFilter"
  | "countFor"
  | "categories"
  | "toggleCategory"
  | "clearCategories"
  | "recursive"
  | "setRecursive"
  | "sort"
  | "setSort"
  | "clear"
  | "start"
  | "end"
  | "total"
>;

interface BrowseFiltersProps<F extends string> {
  scope: BrowseScope;
  filters: readonly F[];
  defaultFilter: F;
  categories: Category[];
  browse: BrowseState<F>;
}

export const BrowseFilters = <F extends string>({
  scope,
  filters,
  defaultFilter,
  categories,
  browse,
}: BrowseFiltersProps<F>) => {
  const t = useTranslations();
  const filterKey: string = `browse.filters.${scope}.${browse.filter}`;

  return (
    <>
      <div className="mb-3">
        <FilterSentence
          scope={scope}
          filters={filters}
          filter={browse.filter}
          defaultFilter={defaultFilter}
          onFilter={browse.setFilter}
          countFor={browse.countFor}
          categories={categories}
          selected={browse.categories}
          recursive={browse.recursive}
          onToggleCategory={browse.toggleCategory}
          onRecursive={browse.setRecursive}
          onClearCategories={browse.clearCategories}
          sort={browse.sort}
          onSort={browse.setSort}
        />
      </div>
      <div className="mb-6">
        <FilterChips
          filterLabel={
            browse.filter !== defaultFilter
              ? t(filterKey)
              : undefined
          }
          onClearFilter={() => browse.setFilter(defaultFilter)}
          categories={browse.categories}
          onRemoveCategory={browse.toggleCategory}
          sort={browse.sort}
          sortLabel={t(`browse.sorts.${browse.sort}`)}
          onClearSort={() => browse.setSort(BrowseSort.UPDATED)}
          onClearAll={browse.clear}
          start={browse.start}
          end={browse.end}
          total={browse.total}
        />
      </div>
    </>
  );
};
