"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { File02Icon } from "hugeicons-react";
import { Category, DefaultNoteFilter, Note, SanitisedUser } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { itemHref } from "@/app/_utils/global-utils";
import { useSettings } from "@/app/_utils/settings-store";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { useBrowse } from "@/app/_hooks/useBrowse";
import { usePins } from "@/app/_hooks/usePins";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";
import { useMediaQuery } from "@/app/_hooks/useMediaQuery";
import { NOTE_FILTERS, RECENT_NOTES_LIMIT } from "@/app/_consts/browse";
import { NOTE_PAGE_COLUMNS } from "@/app/_consts/masonry";
import { EmptyState } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import {
  EmptyIllustration,
  EmptyIllustrations,
} from "@/app/_components/GlobalComponents/Cards/Parts/EmptyIllustration";
import { NoteItems } from "@/app/_components/GlobalComponents/Cards/NoteItems";
import { NoteListItem } from "@/app/_components/GlobalComponents/Cards/NoteListItem";
import { Pagination } from "@/app/_components/GlobalComponents/Layout/Pagination";
import { BrowseHeader } from "@/app/_components/FeatureComponents/Browse/BrowseHeader";
import { BrowseFilters } from "@/app/_components/FeatureComponents/Browse/BrowseFilters";
import { FilteredEmpty } from "@/app/_components/FeatureComponents/Browse/FilteredEmpty";
import { CategoryFilter } from "@/app/_components/FeatureComponents/Browse/CategoryFilter";
import { NotePreview } from "./Parts/NotePreview";

const DESKTOP_QUERY = "(min-width: 1024px)";

interface NotesPageClientProps {
  initialNotes: Note[];
  categories: Category[];
  user: SanitisedUser | null;
}

export const NotesPageClient = ({ initialNotes, categories, user }: NotesPageClientProps) => {
  const t = useTranslations();
  const router = useRouter();
  const compact = useCompactNumber();
  const { viewMode } = useSettings();
  const { openCreateNoteModal } = useShortcut();
  const pins = usePins(initialNotes, user?.pinnedNotes, ItemTypes.NOTE);
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const matches = useCallback(
    (note: Note, filter: DefaultNoteFilter) => filter !== "pinned" || pins.isPinned(note),
    [pins],
  );
  const limitFor = useCallback(
    (filter: DefaultNoteFilter) => (filter === "recent" ? RECENT_NOTES_LIMIT : undefined),
    [],
  );
  const defaultFilter = user?.defaultNoteFilter || "all";
  const browse = useBrowse({ items: initialNotes, defaultFilter, matches, limitFor });

  const open = (note: Note) => router.push(itemHref(ItemTypes.NOTE, note.uuid));

  if (!initialNotes.length) {
    return (
      <EmptyState
        illustration={<EmptyIllustration variant={EmptyIllustrations.NOTES} />}
        title={t("notes.noNotesYet")}
        description={t("notes.createFirstNote")}
        buttonText={t("notes.createNewNote")}
        onButtonClick={() => openCreateNoteModal()}
      />
    );
  }

  const selected =
    browse.pageItems.find((note) => note.uuid === selectedUuid) || browse.pageItems[0];

  return (
    <div className="jotty-notes-page">
      <BrowseHeader
        kicker={t("browse.notesKicker", {
          notesCount: initialNotes.length,
          notes: compact(initialNotes.length),
          pinned: compact(pins.pinned.length),
        })}
        title={t("notes.allNotes")}
        subtitle={t("notes.browseAndManage")}
        createLabel={t("notes.newNote")}
        onCreate={() => openCreateNoteModal()}
      />

      <BrowseFilters
        scope="notes"
        filters={NOTE_FILTERS}
        defaultFilter={defaultFilter}
        categories={categories}
        browse={browse}
      />

      {!browse.pageItems.length ? (
        <FilteredEmpty
          icon={File02Icon}
          title={t("notes.noNotesFound")}
          description={t("notes.tryAdjustingFilters")}
          onClear={browse.clear}
        />
      ) : viewMode === "list" ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 items-start lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] min-[1500px]:grid-cols-[210px_minmax(0,360px)_minmax(0,1fr)]">
          <div className="hidden min-[1500px]:block">
            <CategoryFilter
              categories={categories}
              selected={browse.categories}
              recursive={browse.recursive}
              onToggle={browse.toggleCategory}
              onRecursive={browse.setRecursive}
              onClear={browse.clearCategories}
            />
          </div>
          <div className="bg-card border border-border rounded-jotty divide-y divide-border overflow-hidden min-w-0">
            {browse.pageItems.map((note) => (
              <NoteListItem
                key={note.uuid}
                note={note}
                isBare
                showExcerpt
                isSelected={note.uuid === selected?.uuid}
                onSelect={(picked) =>
                  isDesktop ? setSelectedUuid(picked.uuid) : open(picked)
                }
                isPinned={pins.isPinned(note)}
                onTogglePin={note.lockReason ? undefined : pins.toggle}
              />
            ))}
          </div>
          {selected && (
            <div className="hidden lg:block min-w-0">
              <NotePreview
                note={selected}
                isPinned={pins.isPinned(selected)}
                onOpen={() => open(selected)}
                onTogglePin={selected.lockReason ? undefined : () => pins.toggle(selected)}
              />
            </div>
          )}
        </div>
      ) : (
        <NoteItems
          notes={browse.pageItems}
          view={viewMode}
          columns={NOTE_PAGE_COLUMNS}
          gap="tight"
          onSelect={open}
          isPinned={pins.isPinned}
          onTogglePin={pins.toggle}
        />
      )}

      {browse.pageItems.length > 0 && (
        <Pagination
          variant="footer"
          currentPage={browse.page}
          totalPages={browse.pages}
          onPageChange={browse.setPage}
          itemsPerPage={browse.perPage}
          onItemsPerPageChange={browse.setPerPage}
        />
      )}
    </div>
  );
};
