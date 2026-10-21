"use client";

import { ReactNode, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ItemType, SanitisedUser, TagInfo } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { CreatePrefill } from "@/app/_providers/ShortcutsProvider";
import { useGreeting } from "@/app/_hooks/useGreeting";
import { homeWidgets } from "@/app/_utils/home-widgets";
import { categoryLeaf } from "@/app/_utils/category-path-utils";
import { cn } from "@/app/_utils/global-utils";
import { PINBOARD_BESIDE_TAGS_GRID, PINBOARD_GRID } from "@/app/_consts/columns";
import { HomeHero } from "./HomeHero";
import { HomeFilterHero } from "./HomeFilterHero";
import { QuickCapture } from "./QuickCapture";
import { Pinboard } from "./Pinboard";
import { TagCloud } from "./TagCloud";

const SECTION = "grid gap-4 mb-10 lg:mb-14";

interface HomeTopProps<T extends { uuid: string }> {
  user: SanitisedUser | null;
  type: ItemType;
  promptsKey: string;
  newLabel: string;
  createInKey: string;
  summary: string;
  pickUp: ReactNode;
  pinned: T[];
  pinnedGrid: string;
  renderPin: (item: T, position: number, isBoard: boolean) => ReactNode;
  tagCount: (tag: TagInfo) => number;
  onCreate: (category?: string, prefill?: CreatePrefill) => void;
}

export const HomeTop = <T extends { uuid: string }>({
  user,
  type,
  promptsKey,
  newLabel,
  createInKey,
  summary,
  pickUp,
  pinned,
  pinnedGrid,
  renderPin,
  tagCount,
  onCreate,
}: HomeTopProps<T>) => {
  const t = useTranslations();
  const { selectedFilter, setSelectedFilter, tagsIndex, tagsEnabled } = useAppMode();
  const { date, greeting } = useGreeting(user?.username);
  const widgets = homeWidgets(user);
  const tags = useMemo(() => Object.values(tagsIndex || {}), [tagsIndex]);

  const capture = (category?: string) => (title: string) =>
    onCreate(category, title ? { title } : undefined);

  const filterName =
    selectedFilter?.type === "category"
      ? categoryLeaf(selectedFilter.value, selectedFilter.value)
      : selectedFilter?.value || "";
  const showPickUp = widgets.pickUp && Boolean(pickUp);
  const showTags =
    widgets.tags && tagsEnabled && !selectedFilter && tags.some((tag) => tagCount(tag) > 0);
  const showPins = pinned.length > 0 && !selectedFilter;

  return (
    <>
      {selectedFilter ? (
        <div className="mb-10 lg:mb-14">
          <HomeFilterHero
            filter={selectedFilter}
            name={filterName}
            promptsKey={promptsKey}
            createLabel={t(createInKey, { name: filterName })}
            onCapture={capture(selectedFilter.value)}
            onClear={() => setSelectedFilter(null)}
          />
        </div>
      ) : (
        (widgets.welcome || showPickUp) && (
          <div
            className={cn(
              SECTION,
              widgets.welcome && showPickUp && "xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
            )}
          >
            {widgets.welcome && (
              <HomeHero kicker={date} title={greeting} summary={summary}>
                <QuickCapture
                  promptsKey={promptsKey}
                  buttonLabel={newLabel}
                  onCapture={capture()}
                />
              </HomeHero>
            )}
            {showPickUp && pickUp}
          </div>
        )
      )}

      {(showPins || showTags) && (
        <div
          className={cn(
            SECTION,
            "items-start",
            showPins && showTags && widgets.pinboard && "xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]",
          )}
        >
          {showPins && (
            <Pinboard
              items={pinned}
              isBoard={widgets.pinboard}
              type={type}
              gridClassName={
                !widgets.pinboard
                  ? pinnedGrid
                  : showTags
                    ? PINBOARD_BESIDE_TAGS_GRID
                    : PINBOARD_GRID
              }
              renderItem={(item, position) => renderPin(item, position, widgets.pinboard)}
            />
          )}
          {showTags && (
            <TagCloud
              tags={tags}
              countOf={tagCount}
              onSelect={(tag) => setSelectedFilter({ type: "tag", value: tag.name })}
            />
          )}
        </div>
      )}
    </>
  );
};
