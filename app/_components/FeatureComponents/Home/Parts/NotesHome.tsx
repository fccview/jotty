"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Note, SanitisedUser, TagInfo } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { cn } from "@/app/_utils/global-utils";
import { CreatePrefill } from "@/app/_providers/ShortcutsProvider";
import { useSettings } from "@/app/_utils/settings-store";
import { getNotesForDisplay } from "@/app/_server/actions/note";
import { useFilteredFeed } from "@/app/_hooks/useFilteredFeed";
import { usePins } from "@/app/_hooks/usePins";
import { useGreeting } from "@/app/_hooks/useGreeting";
import { useHomeWidgets } from "@/app/_hooks/useHomeWidgets";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";
import { categoryLeaf } from "@/app/_utils/category-path-utils";
import { NOTE_CARD_COLUMNS } from "@/app/_consts/masonry";
import { NoteCard } from "@/app/_components/GlobalComponents/Cards/NoteCard";
import { NoteItems } from "@/app/_components/GlobalComponents/Cards/NoteItems";
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
import { NotePickUp } from "./NotePickUp";
import { Pinboard } from "./Pinboard";
import {
  PINNED_NOTES_GRID,
  PINBOARD_BESIDE_TAGS_GRID,
  PINBOARD_GRID,
} from "@/app/_consts/pinboard";
import { TagCloud } from "./TagCloud";

const PROMPTS = "browse.notePrompts";

interface NotesHomeProps {
  notes: Note[];
  user: SanitisedUser | null;
  onCreate: (category?: string, prefill?: CreatePrefill) => void;
  onSelectNote: (note: Note) => void;
}

export const NotesHome = ({
  notes,
  user,
  onCreate,
  onSelectNote,
}: NotesHomeProps) => {
  const t = useTranslations();
  const compact = useCompactNumber();
  const { viewMode } = useSettings();
  const {
    selectedFilter,
    setSelectedFilter,
    tagsIndex,
    tagsEnabled,
    notes: allNotes,
  } = useAppMode();
  const { date, greeting } = useGreeting(user?.username);
  const widgets = useHomeWidgets(user);
  const feed = useFilteredFeed<Note>(selectedFilter, getNotesForDisplay);
  const pins = usePins(notes, user?.pinnedNotes, ItemTypes.NOTE);

  const lastEdited = useMemo(
    () =>
      [...notes].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0],
    [notes],
  );

  const recent = useMemo(() => {
    if (selectedFilter) return feed.items;
    return notes
      .filter((note) => !pins.isPinned(note) && note.uuid !== lastEdited?.uuid)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [selectedFilter, feed.items, notes, pins, lastEdited]);

  const tags = useMemo(() => Object.values(tagsIndex || {}), [tagsIndex]);
  const noteCount = useCallback((tag: TagInfo) => tag.noteUuids.length, []);
  const hasTags = tagsEnabled && tags.some((tag) => tag.noteUuids.length > 0);

  const capture = (category?: string) => (title: string) =>
    onCreate(category, title ? { title } : undefined);

  if (!allNotes?.length) {
    return (
      <div className="flex-1 overflow-y-auto jotty-scrollable-content jotty-quick-nav-gutter bg-background h-full">
        <EmptyState
          illustration={
            <EmptyIllustration variant={EmptyIllustrations.NOTES} />
          }
          title={t("notes.noNotesYet")}
          description={t("notes.createFirstNote")}
          buttonText={t("notes.createNewNote")}
          onButtonClick={() => onCreate()}
        />
      </div>
    );
  }

  const encrypted = allNotes.filter((note) => note.encrypted).length;
  const filterName =
    selectedFilter?.type === "category"
      ? categoryLeaf(selectedFilter.value, selectedFilter.value)
      : selectedFilter?.value || "";
  const showTags = widgets.tags && hasTags && !selectedFilter;
  const showPins = pins.pinned.length > 0 && !selectedFilter;

  return (
    <div className="flex-1 overflow-y-auto jotty-scrollable-content jotty-quick-nav-gutter bg-background h-full">
      <div className="max-w-full pt-6 pb-4 px-4 lg:pt-8 lg:pb-12 lg:px-8">
        {selectedFilter ? (
          <div className="mb-10 lg:mb-14">
            <HomeFilterHero
              filter={selectedFilter}
              name={filterName}
              promptsKey={PROMPTS}
              createLabel={t("browse.newNoteIn", { name: filterName })}
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
                  summary={t("browse.notesSummary", {
                    notesCount: allNotes.length,
                    notes: compact(allNotes.length),
                    pinned: compact(pins.pinned.length),
                    encrypted: compact(encrypted),
                  })}
                >
                  <QuickCapture
                    promptsKey={PROMPTS}
                    buttonLabel={t("notes.newNote")}
                    onCapture={capture()}
                  />
                </HomeHero>
              )}
              {widgets.pickUp && lastEdited && (
                <NotePickUp
                  note={lastEdited}
                  onOpen={() => onSelectNote(lastEdited)}
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
                type={ItemTypes.NOTE}
                gridClassName={
                  !widgets.pinboard
                    ? PINNED_NOTES_GRID
                    : showTags
                      ? PINBOARD_BESIDE_TAGS_GRID
                      : PINBOARD_GRID
                }
                renderItem={(note, position) => (
                  <NoteCard
                    note={note}
                    pinPosition={widgets.pinboard ? position : undefined}
                    onSelect={onSelectNote}
                    isPinned
                    onTogglePin={pins.toggle}
                  />
                )}
              />
            )}
            {showTags && (
              <TagCloud
                tags={tags}
                countOf={noteCount}
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

        {recent.length > 0 && (
          <div className="mb-8">
            <SectionHeading
              title={selectedFilter ? t("notes.title") : t("notes.recent")}
            >
              <ViewModeSwitch />
              <ShowAllButton href="/notes" label={t("common.showAll")} />
            </SectionHeading>
            <NoteItems
              notes={recent}
              view={viewMode}
              columns={NOTE_CARD_COLUMNS}
              onSelect={onSelectNote}
              isPinned={pins.isPinned}
              onTogglePin={pins.toggle}
            />
            {selectedFilter && feed.hasMore && (
              <div ref={feed.sentinelRef} className="h-4 min-h-4" aria-hidden />
            )}
            {selectedFilter && feed.isLoadingMore && (
              <div className="py-4 flex justify-center">
                <JottyIcon className="h-10 w-10 text-primary" animated={true} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
