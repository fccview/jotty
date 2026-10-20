"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Category, DefaultNoteFilter, Note, SanitisedUser } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { itemHref } from "@/app/_utils/global-utils";
import { useSettings } from "@/app/_utils/settings-store";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { useBrowse } from "@/app/_hooks/useBrowse";
import { usePins } from "@/app/_hooks/usePins";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";
import { useMediaQuery } from "@/app/_hooks/useMediaQuery";
import { BrowseScope, NOTE_FILTERS, RECENT_NOTES_LIMIT } from "@/app/_consts/browse";
import { NoteItems } from "@/app/_components/GlobalComponents/Cards/NoteItems";
import { NoteListItem } from "@/app/_components/GlobalComponents/Cards/NoteListItem";
import { BrowseShell } from "@/app/_components/FeatureComponents/Browse/BrowseShell";
import { CategoryFilter } from "@/app/_components/FeatureComponents/Browse/CategoryFilter";
import { SCOPE_CONFIG } from "@/app/_components/FeatureComponents/Browse/scope-config";
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
  const { isPinned } = pins;

  const matches = useCallback(
    (note: Note, filter: DefaultNoteFilter) => filter !== "pinned" || isPinned(note),
    [isPinned],
  );
  const limitFor = useCallback(
    (filter: DefaultNoteFilter) => (filter === "recent" ? RECENT_NOTES_LIMIT : undefined),
    [],
  );
  const defaultFilter = user?.defaultNoteFilter || "all";
  const browse = useBrowse({ items: initialNotes, defaultFilter, matches, limitFor });

  const open = (note: Note) => router.push(itemHref(ItemTypes.NOTE, note.uuid));
  const selected =
    browse.pageItems.find((note) => note.uuid === selectedUuid) || browse.pageItems[0];

  return (
    <BrowseShell
      scope={BrowseScope.NOTES}
      isEmpty={!initialNotes.length}
      kicker={t("browse.notesKicker", {
        notesCount: initialNotes.length,
        notes: compact(initialNotes.length),
        pinned: compact(pins.pinned.length),
      })}
      filters={NOTE_FILTERS}
      defaultFilter={defaultFilter}
      categories={categories}
      browse={browse}
      onCreate={() => openCreateNoteModal()}
    >
      {viewMode === "list" ? (
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
          columns={SCOPE_CONFIG[BrowseScope.NOTES].columns}
          gap="tight"
          onSelect={open}
          isPinned={pins.isPinned}
          onTogglePin={pins.toggle}
        />
      )}
    </BrowseShell>
  );
};
