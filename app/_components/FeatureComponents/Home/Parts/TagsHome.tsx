"use client";

import { Cancel01Icon, GridIcon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Checklist, Note, SanitisedUser } from "@/app/_types";
import { NoteCard } from "@/app/_components/GlobalComponents/Cards/NoteCard";
import { ChecklistCard } from "@/app/_components/GlobalComponents/Cards/ChecklistCard";
import { NoteListItem } from "@/app/_components/GlobalComponents/Cards/NoteListItem";
import { NoteGridItem } from "@/app/_components/GlobalComponents/Cards/NoteGridItem";
import { ChecklistListItem } from "@/app/_components/GlobalComponents/Cards/ChecklistListItem";
import { ChecklistGridItem } from "@/app/_components/GlobalComponents/Cards/ChecklistGridItem";
import { EmptyState } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import { ItemViews } from "@/app/_components/GlobalComponents/Cards/ItemViews";
import { NOTE_PAGE_COLUMNS } from "@/app/_consts/columns";
import { newestFirst } from "@/app/_utils/order-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { itemHref } from "@/app/_utils/global-utils";
import { ItemTypes } from "@/app/_types/enums";
import { useTranslations } from "next-intl";
import { useQuickValue } from "@/app/_hooks/settings/useQuickSetting";
import { QuickSettingId } from "@/app/_consts/quick-settings";
import { useMemo, useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getNotesForDisplay } from "@/app/_server/actions/note";
import { getChecklistsForDisplay } from "@/app/_server/actions/checklist";
import { useWindowedList } from "@/app/_hooks/useInfiniteScroll";
import { FILTER_PAGE_SIZE } from "@/app/_consts/files";
type TaggedItem =
  | { itemType: "note"; item: Note }
  | { itemType: "checklist"; item: Checklist };

interface TagsHomeProps {
  notes: Note[];
  checklists: Checklist[];
  user: SanitisedUser | null;
  onCreateModal: () => void;
}

export const TagsHome = ({
  notes: initialNotes,
  checklists: initialChecklists,
  onCreateModal,
}: TagsHomeProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { selectedFilter, setSelectedFilter, tagsIndex } = useAppMode();
  const viewMode = useQuickValue(QuickSettingId.VIEW_MODE);
  const [, startTransition] = useTransition();
  const [displayNotes, setDisplayNotes] = useState<Note[]>(initialNotes);
  const [displayChecklists, setDisplayChecklists] =
    useState<Checklist[]>(initialChecklists);

  const taggedNotes = useMemo(
    () => initialNotes.filter((n) => n.tags && n.tags.length > 0),
    [initialNotes],
  );
  const taggedChecklists = useMemo(
    () => initialChecklists.filter((c) => c.tags && c.tags.length > 0),
    [initialChecklists],
  );

  useEffect(() => {
    if (!selectedFilter || selectedFilter.type !== "tag") {
      setDisplayNotes(taggedNotes);
      setDisplayChecklists(taggedChecklists);
      return;
    }

    startTransition(async () => {
      const [notesResult, checklistsResult] = await Promise.all([
        getNotesForDisplay(selectedFilter, 0, 0),
        getChecklistsForDisplay(selectedFilter, 0, 0),
      ]);
      if (notesResult.success && notesResult.data) {
        setDisplayNotes(notesResult.data as Note[]);
      }
      if (checklistsResult.success && checklistsResult.data) {
        setDisplayChecklists(checklistsResult.data as Checklist[]);
      }
    });
  }, [selectedFilter, taggedNotes, taggedChecklists]);

  const combinedItems: TaggedItem[] = useMemo(() => {
    const items: TaggedItem[] = [
      ...displayNotes.map((note) => ({
        itemType: "note" as const,
        item: note,
      })),
      ...displayChecklists.map((checklist) => ({
        itemType: "checklist" as const,
        item: checklist,
      })),
    ];
    items.sort((a, b) => newestFirst(a.item, b.item));
    return items;
  }, [displayNotes, displayChecklists]);

  const {
    visibleItems: windowedItems,
    sentinelRef,
    hasMore,
  } = useWindowedList({
    items: combinedItems,
    pageSize: FILTER_PAGE_SIZE,
    resetKey: selectedFilter?.type === "tag" ? selectedFilter.value : null,
  });

  const filterDisplayName = useMemo(() => {
    if (!selectedFilter || selectedFilter.type !== "tag") return null;
    return tagsIndex[selectedFilter.value]?.displayName || selectedFilter.value;
  }, [selectedFilter, tagsIndex]);

  const handleSelectNote = (note: Note) => {
    if (!note.uuid) return;
    router.push(itemHref(ItemTypes.NOTE, note.uuid));
  };

  const handleSelectChecklist = (list: Checklist) => {
    if (!list.uuid) return;
    router.push(itemHref(ItemTypes.CHECKLIST, list.uuid));
  };

  if (combinedItems.length === 0 && !selectedFilter) {
    return (
      <div className="flex-1 overflow-y-auto jotty-scrollable-content jotty-quick-nav-gutter bg-background h-full">
        <EmptyState
          icon={GridIcon}
          title={t("notes.tags")}
          description={t("notes.noNotesYet")}
          buttonText={t("common.new")}
          onButtonClick={() => onCreateModal()}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto jotty-scrollable-content jotty-quick-nav-gutter bg-background h-full hide-scrollbar">
      <div className="max-w-full pt-6 pb-4 px-4 lg:pt-8 lg:pb-8 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-foreground tracking-tight">
              {filterDisplayName || t("notes.tags")}
            </h1>
            {selectedFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFilter(null)}
                className="mt-1"
              >
                <Cancel01Icon className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {combinedItems.length > 0 && (
          <>
            <ItemViews
              items={windowedItems}
              view={viewMode}
              keyOf={(tagged) => `${tagged.itemType}-${tagged.item.uuid}`}
              columns={NOTE_PAGE_COLUMNS}
              renderCard={(tagged) =>
                tagged.itemType === "note" ? (
                  <NoteCard note={tagged.item} onSelect={handleSelectNote} />
                ) : (
                  <ChecklistCard list={tagged.item} onSelect={handleSelectChecklist} />
                )
              }
              renderRow={(tagged) =>
                tagged.itemType === "note" ? (
                  <NoteListItem note={tagged.item} onSelect={handleSelectNote} />
                ) : (
                  <ChecklistListItem list={tagged.item} onSelect={handleSelectChecklist} />
                )
              }
              renderTile={(tagged) =>
                tagged.itemType === "note" ? (
                  <NoteGridItem note={tagged.item} onSelect={handleSelectNote} />
                ) : (
                  <ChecklistGridItem list={tagged.item} onSelect={handleSelectChecklist} />
                )
              }
            />

            {hasMore && (
              <div ref={sentinelRef} className="h-4 min-h-4" aria-hidden />
            )}
          </>
        )}
      </div>
    </div>
  );
};
