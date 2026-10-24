"use client";

import { useRouter } from "next/navigation";
import { BrowsePage, Category, Checklist, SanitisedUser } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { itemHref } from "@/app/_utils/global-utils";
import { useQuickValue } from "@/app/_hooks/settings/useQuickSetting";
import { QuickSettingId } from "@/app/_consts/quick-settings";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { useServerBrowse } from "@/app/_hooks/useServerBrowse";
import { usePins } from "@/app/_hooks/usePins";
import { BOARD_FILTERS, BrowseScope, CHECKLIST_FILTERS, ListFilter } from "@/app/_consts/browse";
import { ChecklistItems } from "@/app/_components/GlobalComponents/Cards/ChecklistItems";
import { BrowseShell } from "@/app/_components/FeatureComponents/Browse/BrowseShell";
import { SCOPE_CONFIG } from "@/app/_components/FeatureComponents/Browse/scope-config";

const KANBAN_PREFILL = { type: "kanban" } as const;

interface ListsBrowserProps {
  scope: BrowseScope.CHECKLISTS | BrowseScope.BOARDS;
  initialPage: BrowsePage<Checklist>;
  categories: Category[];
  user: SanitisedUser | null;
  kickerOf: (numbers: Record<string, number>, size: number) => string;
}

export const ListsBrowser = ({ scope, initialPage, categories, user, kickerOf }: ListsBrowserProps) => {
  const router = useRouter();
  const viewMode = useQuickValue(QuickSettingId.VIEW_MODE);
  const { openCreateChecklistModal } = useShortcut();
  const isBoards = scope === BrowseScope.BOARDS;
  const defaultFilter: ListFilter = isBoards ? "all" : user?.defaultChecklistFilter || "all";
  const browse = useServerBrowse<Checklist, ListFilter>({ scope, initial: initialPage, defaultFilter });
  const pins = usePins(browse.pageItems, user?.pinnedLists, ItemTypes.CHECKLIST);

  const create = () =>
    openCreateChecklistModal(undefined, isBoards ? KANBAN_PREFILL : undefined);
  const open = (list: Checklist) => router.push(itemHref(ItemTypes.CHECKLIST, list.uuid));

  return (
    <BrowseShell
      scope={scope}
      isEmpty={!browse.size}
      kicker={kickerOf(browse.kicker, browse.size)}
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
