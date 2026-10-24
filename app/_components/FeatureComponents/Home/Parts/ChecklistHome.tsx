"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Checklist, SanitisedUser, TagInfo } from "@/app/_types";
import { isKanbanType, ItemTypes } from "@/app/_types/enums";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { CreatePrefill } from "@/app/_providers/ShortcutsProvider";
import { useQuickValue } from "@/app/_hooks/settings/useQuickSetting";
import { QuickSettingId } from "@/app/_consts/quick-settings";
import { newestFirst } from "@/app/_utils/order-utils";
import { getChecklistsForDisplay } from "@/app/_server/actions/checklist";
import { useHomeFeed } from "@/app/_hooks/useHomeFeed";
import { usePins } from "@/app/_hooks/usePins";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";
import { BOARD_CARD_COLUMNS, LIST_CARD_COLUMNS } from "@/app/_consts/columns";
import { ChecklistCard } from "@/app/_components/GlobalComponents/Cards/ChecklistCard";
import { PinnedChecklistCard } from "@/app/_components/GlobalComponents/Cards/PinnedChecklistCard";
import { ChecklistItems } from "@/app/_components/GlobalComponents/Cards/ChecklistItems";
import { ItemsEmpty } from "@/app/_components/GlobalComponents/Cards/ItemsEmpty";
import { EmptyActions } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import { EmptyIllustrations } from "@/app/_components/GlobalComponents/Cards/Parts/EmptyIllustration";
import { SectionHeading } from "@/app/_components/GlobalComponents/Layout/SectionHeading";
import { ViewModeSwitch } from "@/app/_components/GlobalComponents/Buttons/ViewModeSwitch";
import { ShowAllButton } from "@/app/_components/GlobalComponents/Buttons/ShowAllButton";
import { HomeTop } from "./HomeTop";
import { HomeFrame } from "./HomeFrame";
import { FeedLoading, FeedTail } from "./HomeFeedStatus";
import { ChecklistPickUp } from "./ChecklistPickUp";

const PROMPTS = "browse.listPrompts";

const listTagCount = (tag: TagInfo) => tag.checklistCount;

interface ChecklistHomeProps {
  lists: Checklist[];
  user: SanitisedUser | null;
  openItems: number;
  onCreate: (category?: string, prefill?: CreatePrefill) => void;
  onSelectChecklist: (list: Checklist) => void;
}

export const ChecklistHome = ({
  lists,
  user,
  openItems,
  onCreate,
  onSelectChecklist,
}: ChecklistHomeProps) => {
  const t = useTranslations();
  const compact = useCompactNumber();
  const viewMode = useQuickValue(QuickSettingId.VIEW_MODE);
  const { library } = useAppMode();
  const feed = useHomeFeed<Checklist>(getChecklistsForDisplay);
  const pins = usePins(lists, user?.pinnedLists, ItemTypes.CHECKLIST);

  const lastEdited = useMemo(() => {
    const sorted = [...lists].sort(newestFirst);
    return sorted.find((list) => !isKanbanType(list.type)) || sorted[0];
  }, [lists]);

  const { boards, simple } = useMemo(() => {
    const rest = feed.filter
      ? feed.items
      : lists
          .filter((list) => !pins.isPinned(list) && list.uuid !== lastEdited?.uuid)
          .sort(newestFirst);
    return {
      boards: rest.filter((list) => isKanbanType(list.type)),
      simple: rest.filter((list) => !isKanbanType(list.type)),
    };
  }, [feed.filter, feed.items, lists, pins, lastEdited]);

  if (!library.checklists) {
    return (
      <HomeFrame isBare>
        <ItemsEmpty
          kind={EmptyIllustrations.CHECKLISTS}
          action={EmptyActions.CREATE}
          onAction={() => onCreate()}
        />
      </HomeFrame>
    );
  }

  const boardCount = library.boards;
  const simpleCount = library.checklists - boardCount;

  return (
    <HomeFrame>
      <HomeTop
        user={user}
        type={ItemTypes.CHECKLIST}
        promptsKey={PROMPTS}
        newLabel={t("checklists.newChecklist")}
        createInKey="browse.newChecklistIn"
        summary={t("browse.checklistsSummary", {
          listsCount: simpleCount,
          lists: compact(simpleCount),
          boardsCount: boardCount,
          boards: compact(boardCount),
          open: compact(openItems),
        })}
        pickUp={
          lastEdited && (
            <ChecklistPickUp list={lastEdited} onOpen={() => onSelectChecklist(lastEdited)} />
          )
        }
        pinned={pins.pinned}
        pinnedColumns={LIST_CARD_COLUMNS}
        tagCount={listTagCount}
        onCreate={onCreate}
        renderPin={(list, _position, isBoard) =>
          isBoard ? (
            <PinnedChecklistCard list={list} onSelect={onSelectChecklist} onTogglePin={pins.toggle} />
          ) : (
            <ChecklistCard list={list} onSelect={onSelectChecklist} isPinned onTogglePin={pins.toggle} />
          )
        }
      />

      <FeedLoading feed={feed} />

      <div className="space-y-10 lg:space-y-14">
        {boards.length > 0 && (
          <div>
            <SectionHeading title={feed.filter ? t("kanban.title") : t("kanban.recentBoards")}>
              <ViewModeSwitch />
              <ShowAllButton href="/kanban" label={t("kanban.showAllBoards")} />
            </SectionHeading>
            <ChecklistItems
              lists={boards}
              view={viewMode}
              columns={BOARD_CARD_COLUMNS}
              onSelect={onSelectChecklist}
              isPinned={pins.isPinned}
              onTogglePin={pins.toggle}
            />
          </div>
        )}

        {simple.length > 0 && (
          <div>
            <SectionHeading title={feed.filter ? t("checklists.title") : t("checklists.recent")}>
              {!boards.length && <ViewModeSwitch />}
              <ShowAllButton href="/checklists" label={t("common.showAll")} />
            </SectionHeading>
            <ChecklistItems
              lists={simple}
              view={viewMode}
              columns={LIST_CARD_COLUMNS}
              onSelect={onSelectChecklist}
              isPinned={pins.isPinned}
              onTogglePin={pins.toggle}
            />
          </div>
        )}

        <FeedTail feed={feed} />
      </div>
    </HomeFrame>
  );
};
