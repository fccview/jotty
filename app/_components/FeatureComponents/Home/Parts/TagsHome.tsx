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
import Masonry from "react-masonry-css";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { encodeCategoryPath, buildCategoryPath } from "@/app/_utils/global-utils";
import { useTranslations } from "next-intl";
import { useSettings } from "@/app/_utils/settings-store";
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

const breakpointColumnsObj = {
  default: 3,
  1280: 3,
  1024: 2,
  768: 2,
  640: 1,
};

export const TagsHome = ({
  notes: initialNotes,
  checklists: initialChecklists,
  onCreateModal,
}: TagsHomeProps) => {
  const t = useTranslations();
  const router = useRouter();
  const {
    selectedFilter,
    setSelectedFilter,
    tagsIndex,
    userSharedItems,
  } = useAppMode();
  const { viewMode } = useSettings();
  const [, startTransition] = useTransition();
  const [displayNotes, setDisplayNotes] = useState<Note[]>(initialNotes);
  const [displayChecklists, setDisplayChecklists] = useState<Checklist[]>(initialChecklists);

  const taggedNotes = useMemo(
    () => initialNotes.filter((n) => n.tags && n.tags.length > 0),
    [initialNotes]
  );
  const taggedChecklists = useMemo(
    () => initialChecklists.filter((c) => c.tags && c.tags.length > 0),
    [initialChecklists]
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
      ...displayNotes.map((note) => ({ itemType: "note" as const, item: note })),
      ...displayChecklists.map((checklist) => ({
        itemType: "checklist" as const,
        item: checklist,
      })),
    ];
    items.sort(
      (a, b) =>
        new Date(b.item.updatedAt).getTime() -
        new Date(a.item.updatedAt).getTime()
    );
    return items;
  }, [displayNotes, displayChecklists]);

  const { visibleItems: windowedItems, sentinelRef, hasMore } = useWindowedList({
    items: combinedItems,
    pageSize: FILTER_PAGE_SIZE,
    resetKey: selectedFilter?.type === "tag" ? selectedFilter.value : null,
  });

  const filterDisplayName = useMemo(() => {
    if (!selectedFilter || selectedFilter.type !== "tag") return null;
    return (
      tagsIndex[selectedFilter.value]?.displayName || selectedFilter.value
    );
  }, [selectedFilter, tagsIndex]);

  const getNoteSharer = (note: Note) => {
    const encodedCategory = encodeCategoryPath(
      note.category || "Uncategorized"
    );
    const sharedItem = userSharedItems?.notes?.find(
      (item) => item.id === note.id && item.category === encodedCategory
    );
    return sharedItem?.sharer;
  };

  const getListSharer = (list: Checklist) => {
    const encodedCategory = encodeCategoryPath(
      list.category || "Uncategorized"
    );
    const sharedItem = userSharedItems?.checklists?.find(
      (item) => item.id === list.id && item.category === encodedCategory
    );
    return sharedItem?.sharer;
  };

  const handleSelectNote = (note: Note) => {
    const categoryPath = buildCategoryPath(
      note.category || "Uncategorized",
      note.id
    );
    router.push(`/note/${categoryPath}`);
  };

  const handleSelectChecklist = (list: Checklist) => {
    const categoryPath = buildCategoryPath(
      list.category || "Uncategorized",
      list.id
    );
    router.push(`/checklist/${categoryPath}`);
  };

  if (combinedItems.length === 0 && !selectedFilter) {
    return (
      <div className="flex-1 overflow-y-auto jotty-scrollable-content bg-background h-full">
        <EmptyState
          icon={<GridIcon className="h-10 w-10 text-muted-foreground" />}
          title={t("notes.tags")}
          description={t("notes.noNotesYet")}
          buttonText={t("common.new")}
          onButtonClick={() => onCreateModal()}
        />
      </div>
    );
  }

  const renderItem = (tagged: TaggedItem, keyPrefix: string) => {
    if (tagged.itemType === "note") {
      const note = tagged.item as Note;
      if (viewMode === "card") {
        return (
          <div key={`${keyPrefix}-note-${note.category}-${note.uuid || note.id}`} className="mb-6">
            <NoteCard
              note={note}
              onSelect={handleSelectNote}
              isPinned={false}
              sharer={getNoteSharer(note)}
            />
          </div>
        );
      }
      if (viewMode === "list") {
        return (
          <NoteListItem
            key={`${keyPrefix}-note-${note.category}-${note.uuid || note.id}`}
            note={note}
            onSelect={handleSelectNote}
            isPinned={false}
            sharer={getNoteSharer(note)}
          />
        );
      }
      return (
        <NoteGridItem
          key={`${keyPrefix}-note-${note.category}-${note.uuid || note.id}`}
          note={note}
          onSelect={handleSelectNote}
          isPinned={false}
          sharer={getNoteSharer(note)}
        />
      );
    }

    const list = tagged.item as Checklist;
    if (viewMode === "card") {
      return (
        <div key={`${keyPrefix}-cl-${list.category}-${list.uuid || list.id}`} className="mb-6">
          <ChecklistCard
            list={list}
            onSelect={handleSelectChecklist}
            isPinned={false}
            sharer={getListSharer(list)}
          />
        </div>
      );
    }
    if (viewMode === "list") {
      return (
        <ChecklistListItem
          key={`${keyPrefix}-cl-${list.category}-${list.uuid || list.id}`}
          list={list}
          onSelect={handleSelectChecklist}
          isPinned={false}
          sharer={getListSharer(list)}
        />
      );
    }
    return (
      <ChecklistGridItem
        key={`${keyPrefix}-cl-${list.category}-${list.uuid || list.id}`}
        list={list}
        onSelect={handleSelectChecklist}
        isPinned={false}
        sharer={getListSharer(list)}
      />
    );
  };

  return (
    <div className="flex-1 overflow-y-auto jotty-scrollable-content bg-background h-full hide-scrollbar">
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
            {viewMode === "card" && (
              <Masonry
                breakpointCols={breakpointColumnsObj}
                className="flex w-auto -ml-6"
                columnClassName="pl-6 bg-clip-padding"
              >
                {windowedItems.map((item) => renderItem(item, "tags"))}
              </Masonry>
            )}

            {viewMode === "list" && (
              <div className="space-y-3">
                {windowedItems.map((item) => renderItem(item, "tags"))}
              </div>
            )}

            {viewMode === "grid" && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {windowedItems.map((item) => renderItem(item, "tags"))}
              </div>
            )}

            {hasMore && (
              <div ref={sentinelRef} className="h-4 min-h-4" aria-hidden />
            )}
          </>
        )}
      </div>
    </div>
  );
};
