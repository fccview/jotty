"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Checklist, SanitisedUser, TagInfo } from "@/app/_types";
import { isKanbanType, ItemTypes } from "@/app/_types/enums";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { cn } from "@/app/_utils/global-utils";
import { CreatePrefill } from "@/app/_providers/ShortcutsProvider";
import { useSettings } from "@/app/_utils/settings-store";
import { getChecklistsForDisplay } from "@/app/_server/actions/checklist";
import { useFilteredFeed } from "@/app/_hooks/useFilteredFeed";
import { usePins } from "@/app/_hooks/usePins";
import { useGreeting } from "@/app/_hooks/useGreeting";
import { useHomeWidgets } from "@/app/_hooks/useHomeWidgets";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";
import { categoryLeaf } from "@/app/_utils/category-path-utils";
import { BOARD_CARD_COLUMNS, LIST_CARD_COLUMNS } from "@/app/_consts/masonry";
import { ChecklistCard } from "@/app/_components/GlobalComponents/Cards/ChecklistCard";
import { ChecklistItems } from "@/app/_components/GlobalComponents/Cards/ChecklistItems";
import { SectionHeading } from "@/app/_components/GlobalComponents/Layout/SectionHeading";
import { ViewModeSwitch } from "@/app/_components/GlobalComponents/Buttons/ViewModeSwitch";
import { ShowAllButton } from "@/app/_components/GlobalComponents/Buttons/ShowAllButton";
import { EmptyState } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import {
  EmptyIllustration,
  EmptyIllustrations,
} from "@/app/_components/GlobalComponents/Cards/Parts/EmptyIllustration";
import { JottyIcon } from "@/app/_components/GlobalComponents/Layout/CustomIcons/JottyIcon";
import { HomeHero } from "./HomeHero";
import { HomeFilterHero } from "./HomeFilterHero";
import { QuickCapture } from "./QuickCapture";
import { ChecklistPickUp } from "./ChecklistPickUp";
import { Pinboard } from "./Pinboard";
import {
  PINNED_LISTS_GRID,
  PINBOARD_BESIDE_TAGS_GRID,
  PINBOARD_GRID,
} from "@/app/_consts/pinboard";
import { TagCloud } from "./TagCloud";

const PROMPTS = "browse.listPrompts";

const byUpdated = (a: Checklist, b: Checklist) =>
  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

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
  const { viewMode } = useSettings();
  const {
    selectedFilter,
    setSelectedFilter,
    tagsIndex,
    tagsEnabled,
    checklists: allLists,
  } = useAppMode();
  const { date, greeting } = useGreeting(user?.username);
  const widgets = useHomeWidgets(user);
  const feed = useFilteredFeed<Checklist>(
    selectedFilter,
    getChecklistsForDisplay,
  );
  const pins = usePins(lists, user?.pinnedLists, ItemTypes.CHECKLIST);

  const lastEdited = useMemo(() => {
    const sorted = [...lists].sort(byUpdated);
    return sorted.find((list) => !isKanbanType(list.type)) || sorted[0];
  }, [lists]);

  const { boards, simple } = useMemo(() => {
    const rest = selectedFilter
      ? feed.items
      : lists
          .filter(
            (list) => !pins.isPinned(list) && list.uuid !== lastEdited?.uuid,
          )
          .sort(byUpdated);
    return {
      boards: rest.filter((list) => isKanbanType(list.type)),
      simple: rest.filter((list) => !isKanbanType(list.type)),
    };
  }, [selectedFilter, feed.items, lists, pins, lastEdited]);

  const tags = useMemo(() => Object.values(tagsIndex || {}), [tagsIndex]);
  const listCount = useCallback(
    (tag: TagInfo) => tag.checklistUuids.length,
    [],
  );

  const capture = (category?: string) => (title: string) =>
    onCreate(category, title ? { title } : undefined);

  if (!allLists?.length) {
    return (
      <div className="h-full overflow-y-auto bg-background jotty-scrollable-content jotty-quick-nav-gutter">
        <EmptyState
          illustration={
            <EmptyIllustration variant={EmptyIllustrations.CHECKLISTS} />
          }
          title={t("checklists.noChecklistsYet")}
          description={t("checklists.createFirstChecklist")}
          buttonText={t("checklists.newChecklist")}
          onButtonClick={() => onCreate()}
        />
      </div>
    );
  }

  const boardCount = allLists.filter((list) => isKanbanType(list.type)).length;
  const simpleCount = allLists.length - boardCount;
  const filterName =
    selectedFilter?.type === "category"
      ? categoryLeaf(selectedFilter.value, selectedFilter.value)
      : selectedFilter?.value || "";
  const showTags =
    widgets.tags &&
    tagsEnabled &&
    !selectedFilter &&
    tags.some((tag) => tag.checklistUuids.length > 0);
  const showPins = pins.pinned.length > 0 && !selectedFilter;

  return (
    <div className="h-full overflow-y-auto bg-background jotty-scrollable-content jotty-quick-nav-gutter">
      <div className="max-w-full pt-6 pb-4 px-4 lg:pt-8 lg:pb-12 lg:px-8">
        {selectedFilter ? (
          <div className="mb-10 lg:mb-14">
            <HomeFilterHero
              filter={selectedFilter}
              name={filterName}
              promptsKey={PROMPTS}
              createLabel={t("browse.newChecklistIn", { name: filterName })}
              onCapture={capture(selectedFilter.value)}
              onClear={() => setSelectedFilter(null)}
            />
          </div>
        ) : (
          (widgets.welcome || (widgets.pickUp && lastEdited)) && (
            <div
              className={cn(
                "grid gap-4 mb-10 lg:mb-14",
                widgets.welcome &&
                  widgets.pickUp &&
                  lastEdited &&
                  "xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
              )}
            >
              {widgets.welcome && (
                <HomeHero
                  kicker={date}
                  title={greeting}
                  summary={t("browse.checklistsSummary", {
                    listsCount: simpleCount,
                    lists: compact(simpleCount),
                    boardsCount: boardCount,
                    boards: compact(boardCount),
                    open: compact(openItems),
                  })}
                >
                  <QuickCapture
                    promptsKey={PROMPTS}
                    buttonLabel={t("checklists.newChecklist")}
                    onCapture={capture()}
                  />
                </HomeHero>
              )}
              {widgets.pickUp && lastEdited && (
                <ChecklistPickUp
                  list={lastEdited}
                  onOpen={() => onSelectChecklist(lastEdited)}
                />
              )}
            </div>
          )
        )}

        {(showPins || showTags) && (
          <div
            className={
              showPins && showTags && widgets.pinboard
                ? "grid gap-4 mb-10 lg:mb-14 items-start xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]"
                : "grid gap-4 mb-10 lg:mb-14 items-start"
            }
          >
            {showPins && (
              <Pinboard
                items={pins.pinned}
                isBoard={widgets.pinboard}
                type={ItemTypes.CHECKLIST}
                gridClassName={
                  !widgets.pinboard
                    ? PINNED_LISTS_GRID
                    : showTags
                      ? PINBOARD_BESIDE_TAGS_GRID
                      : PINBOARD_GRID
                }
                renderItem={(list) => (
                  <ChecklistCard
                    list={list}
                    compact={widgets.pinboard}
                    onSelect={onSelectChecklist}
                    isPinned
                    onTogglePin={pins.toggle}
                  />
                )}
              />
            )}
            {showTags && (
              <TagCloud
                tags={tags}
                countOf={listCount}
                onSelect={(tag) =>
                  setSelectedFilter({ type: "tag", value: tag.name })
                }
              />
            )}
          </div>
        )}

        {feed.isLoadingFirst && (
          <div className="flex items-center justify-center min-h-[240px]">
            <JottyIcon className="h-16 w-16 text-primary" animated={true} />
          </div>
        )}

        <div className="space-y-10 lg:space-y-14">
          {boards.length > 0 && (
            <div>
              <SectionHeading
                title={
                  selectedFilter ? t("kanban.title") : t("kanban.recentBoards")
                }
              >
                <ViewModeSwitch />
                <ShowAllButton
                  href="/kanban"
                  label={t("kanban.showAllBoards")}
                />
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
              <SectionHeading
                title={
                  selectedFilter
                    ? t("checklists.title")
                    : t("checklists.recent")
                }
              >
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

          {selectedFilter && feed.hasMore && (
            <div ref={feed.sentinelRef} className="h-4 min-h-4" aria-hidden />
          )}
          {selectedFilter && feed.isLoadingMore && (
            <div className="py-4 flex justify-center">
              <JottyIcon className="h-10 w-10 text-primary" animated={true} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
