"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Category, Checklist, SanitisedUser } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { itemHref } from "@/app/_utils/global-utils";
import { useSettings } from "@/app/_utils/settings-store";
import { matchesListFilter } from "@/app/_utils/browse-utils";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { useBrowse } from "@/app/_hooks/useBrowse";
import { usePins } from "@/app/_hooks/usePins";
import { BOARD_FILTERS, BrowseScope, CHECKLIST_FILTERS, ListFilter } from "@/app/_consts/browse";
import { ChecklistItems } from "@/app/_components/GlobalComponents/Cards/ChecklistItems";
import { BrowseShell } from "@/app/_components/FeatureComponents/Browse/BrowseShell";
import { SCOPE_CONFIG } from "@/app/_components/FeatureComponents/Browse/scope-config";

const KANBAN_PREFILL = { type: "kanban" } as const;

interface ListsBrowserProps {
  scope: BrowseScope.CHECKLISTS | BrowseScope.BOARDS;
  lists: Checklist[];
  categories: Category[];
  user: SanitisedUser | null;
  kicker: string;
}

export const ListsBrowser = ({ scope, lists, categories, user, kicker }: ListsBrowserProps) => {
  const router = useRouter();
  const { viewMode } = useSettings();
  const { openCreateChecklistModal } = useShortcut();
  const pins = usePins(lists, user?.pinnedLists, ItemTypes.CHECKLIST);
  const isBoards = scope === BrowseScope.BOARDS;
  const { isPinned } = pins;

  const matches = useCallback(
    (list: Checklist, filter: ListFilter) => matchesListFilter(list, filter, isPinned(list)),
    [isPinned],
  );
  const defaultFilter: ListFilter = isBoards ? "all" : user?.defaultChecklistFilter || "all";
  const browse = useBrowse<Checklist, ListFilter>({ items: lists, defaultFilter, matches });

  const create = () =>
    openCreateChecklistModal(undefined, isBoards ? KANBAN_PREFILL : undefined);
  const open = (list: Checklist) => router.push(itemHref(ItemTypes.CHECKLIST, list.uuid));

  return (
    <BrowseShell
      scope={scope}
      isEmpty={!lists.length}
      kicker={kicker}
      filters={isBoards ? BOARD_FILTERS : CHECKLIST_FILTERS}
      defaultFilter={defaultFilter}
      categories={categories}
      browse={browse}
      onCreate={create}
    >
      <ChecklistItems
        lists={browse.pageItems}
        view={viewMode}
        columns={SCOPE_CONFIG[scope].columns}
        gap="tight"
        onSelect={open}
        isPinned={pins.isPinned}
        onTogglePin={pins.toggle}
      />
    </BrowseShell>
  );
};
