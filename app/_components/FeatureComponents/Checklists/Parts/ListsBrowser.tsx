"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckmarkSquare04Icon, TaskDaily01Icon } from "hugeicons-react";
import { Category, Checklist, SanitisedUser } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { itemHref } from "@/app/_utils/global-utils";
import { useSettings } from "@/app/_utils/settings-store";
import { matchesListFilter } from "@/app/_utils/browse-utils";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { useBrowse } from "@/app/_hooks/useBrowse";
import { usePins } from "@/app/_hooks/usePins";
import { BOARD_FILTERS, BoardFilter, CHECKLIST_FILTERS } from "@/app/_consts/browse";
import { BOARD_CARD_COLUMNS, LIST_CARD_COLUMNS } from "@/app/_consts/masonry";
import { EmptyState } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import {
  EmptyIllustration,
  EmptyIllustrations,
} from "@/app/_components/GlobalComponents/Cards/Parts/EmptyIllustration";
import { ChecklistItems } from "@/app/_components/GlobalComponents/Cards/ChecklistItems";
import { Pagination } from "@/app/_components/GlobalComponents/Layout/Pagination";
import { BrowseHeader } from "@/app/_components/FeatureComponents/Browse/BrowseHeader";
import { BrowseFilters } from "@/app/_components/FeatureComponents/Browse/BrowseFilters";
import { FilteredEmpty } from "@/app/_components/FeatureComponents/Browse/FilteredEmpty";

type ListFilter = (typeof CHECKLIST_FILTERS)[number] | BoardFilter;

interface ListsBrowserProps {
  isBoards: boolean;
  lists: Checklist[];
  categories: Category[];
  user: SanitisedUser | null;
  kicker: string;
}

export const ListsBrowser = ({ isBoards, lists, categories, user, kicker }: ListsBrowserProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { viewMode } = useSettings();
  const { openCreateChecklistModal } = useShortcut();
  const pins = usePins(lists, user?.pinnedLists, ItemTypes.CHECKLIST);

  const matches = useCallback(
    (list: Checklist, filter: ListFilter) => matchesListFilter(list, filter, pins.isPinned(list)),
    [pins],
  );
  const defaultFilter: ListFilter = isBoards ? "all" : user?.defaultChecklistFilter || "all";
  const browse = useBrowse<Checklist, ListFilter>({ items: lists, defaultFilter, matches });

  const create = () => openCreateChecklistModal(undefined, isBoards ? { type: "kanban" } : undefined);
  const open = (list: Checklist) => router.push(itemHref(ItemTypes.CHECKLIST, list.uuid));

  if (!lists.length) {
    return (
      <EmptyState
        illustration={
          <EmptyIllustration
            variant={isBoards ? EmptyIllustrations.BOARDS : EmptyIllustrations.CHECKLISTS}
          />
        }
        title={isBoards ? t("kanban.noBoardsYet") : t("checklists.noChecklistsYet")}
        description={isBoards ? t("kanban.createFirstBoard") : t("checklists.createFirstChecklist")}
        buttonText={isBoards ? t("kanban.newBoard") : t("checklists.newChecklist")}
        onButtonClick={create}
      />
    );
  }

  return (
    <div className="jotty-lists-page">
      <BrowseHeader
        kicker={kicker}
        title={isBoards ? t("kanban.boards") : t("checklists.allChecklists")}
        subtitle={isBoards ? t("tasks.browseAndManageTaskLists") : t("checklists.browseAndManage")}
        createLabel={isBoards ? t("kanban.newBoard") : t("checklists.newChecklist")}
        onCreate={create}
      />

      <BrowseFilters
        scope={isBoards ? "boards" : "checklists"}
        filters={isBoards ? BOARD_FILTERS : CHECKLIST_FILTERS}
        defaultFilter={defaultFilter}
        categories={categories}
        browse={browse}
      />

      {browse.pageItems.length ? (
        <>
          <ChecklistItems
            lists={browse.pageItems}
            view={viewMode}
            columns={isBoards ? BOARD_CARD_COLUMNS : LIST_CARD_COLUMNS}
            gap="tight"
            onSelect={open}
            isPinned={pins.isPinned}
            onTogglePin={pins.toggle}
          />
          <Pagination
            variant="footer"
            currentPage={browse.page}
            totalPages={browse.pages}
            onPageChange={browse.setPage}
            itemsPerPage={browse.perPage}
            onItemsPerPageChange={browse.setPerPage}
          />
        </>
      ) : (
        <FilteredEmpty
          icon={isBoards ? TaskDaily01Icon : CheckmarkSquare04Icon}
          title={isBoards ? t("kanban.noBoards") : t("checklists.noChecklistsFound")}
          description={
            isBoards ? t("kanban.tryAdjustingFilters") : t("checklists.tryAdjustingFiltersChecklist")
          }
          onClear={browse.clear}
        />
      )}
    </div>
  );
};
