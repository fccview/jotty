"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Category } from "@/app/_types";
import { BrowseScope } from "@/app/_consts/browse";
import { BrowseControls } from "@/app/_hooks/useServerBrowse";
import { ItemsEmpty } from "@/app/_components/GlobalComponents/Cards/ItemsEmpty";
import { EmptyActions } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import { Pagination } from "@/app/_components/GlobalComponents/Layout/Pagination";
import { BrowseHeader } from "./BrowseHeader";
import { BrowseFilters } from "./BrowseFilters";
import { SCOPE_CONFIG } from "./scope-config";

interface BrowseShellProps<F extends string> {
  scope: BrowseScope;
  isEmpty: boolean;
  kicker: string;
  filters: readonly F[];
  defaultFilter: F;
  categories: Category[];
  browse: BrowseControls<F>;
  onCreate: () => void;
  children: ReactNode;
}

export const BrowseShell = <F extends string>({
  scope,
  isEmpty,
  kicker,
  filters,
  defaultFilter,
  categories,
  browse,
  onCreate,
  children,
}: BrowseShellProps<F>) => {
  const t = useTranslations();
  const config = SCOPE_CONFIG[scope];

  if (isEmpty) {
    return <ItemsEmpty kind={config.empty} action={EmptyActions.CREATE} onAction={onCreate} />;
  }

  return (
    <div className={config.className}>
      <BrowseHeader
        kicker={kicker}
        title={t(config.title)}
        subtitle={t(config.subtitle)}
        createLabel={t(config.createLabel)}
        onCreate={onCreate}
      />

      <BrowseFilters
        scope={scope}
        filters={filters}
        defaultFilter={defaultFilter}
        categories={categories}
        browse={browse}
      />

      {browse.pageItems.length ? (
        <>
          {children}
          <Pagination
            currentPage={browse.page}
            totalPages={browse.pages}
            onPageChange={browse.setPage}
            itemsPerPage={browse.perPage}
            onItemsPerPageChange={browse.setPerPage}
          />
        </>
      ) : (
        <ItemsEmpty kind={config.empty} action={EmptyActions.CLEAR} onAction={browse.clear} />
      )}
    </div>
  );
};
