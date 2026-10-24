"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BrowsePage, Category, DefaultNoteFilter, Note, SanitisedUser } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { itemHref } from "@/app/_utils/global-utils";
import { useQuickValue } from "@/app/_hooks/settings/useQuickSetting";
import { QuickSettingId } from "@/app/_consts/quick-settings";
import { ViewMode } from "@/app/_consts/view-modes";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { useServerBrowse } from "@/app/_hooks/useServerBrowse";
import { useNoteBodies } from "@/app/_hooks/browse/useNoteBodies";
import { usePins } from "@/app/_hooks/usePins";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";
import { useMediaQuery } from "@/app/_hooks/useMediaQuery";
import { BodyCookie, BrowseScope, DESKTOP_QUERY, NOTE_FILTERS } from "@/app/_consts/browse";
import { bodyNeedOf } from "@/app/_utils/browse/body-cookie";
import { NoteItems } from "@/app/_components/GlobalComponents/Cards/NoteItems";
import { NoteListItem } from "@/app/_components/GlobalComponents/Cards/NoteListItem";
import { BrowseShell } from "@/app/_components/FeatureComponents/Browse/BrowseShell";
import { CategoryFilter } from "@/app/_components/FeatureComponents/Browse/CategoryFilter";
import { SCOPE_CONFIG } from "@/app/_components/FeatureComponents/Browse/scope-config";
import { NotePreview } from "./Parts/NotePreview";

const NO_NOTES: Note[] = [];

interface NotesPageClientProps {
  initialPage: BrowsePage<Note>;
  categories: Category[];
  user: SanitisedUser | null;
}

export const NotesPageClient = ({ initialPage, categories, user }: NotesPageClientProps) => {
  const t = useTranslations();
  const router = useRouter();
  const compact = useCompactNumber();
  const viewMode = useQuickValue(QuickSettingId.VIEW_MODE);
  const showMarkdownPreview = useQuickValue(QuickSettingId.CARD_PREVIEW);
  const { openCreateNoteModal } = useShortcut();
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const defaultFilter: DefaultNoteFilter = user?.defaultNoteFilter || "all";
  const browse = useServerBrowse<Note, DefaultNoteFilter>({
    scope: BrowseScope.NOTES,
    initial: initialPage,
    defaultFilter,
  });
  const pins = usePins(browse.pageItems, user?.pinnedNotes, ItemTypes.NOTE);
  const need = bodyNeedOf({ showMarkdownPreview, viewMode, isDesktop });
  const wanted = useMemo(() => {
    if (need === BodyCookie.ON) return browse.pageItems;
    if (need === BodyCookie.OFF) return NO_NOTES;
    const focus = browse.pageItems.find((note) => note.uuid === selectedUuid) || browse.pageItems[0];
    return focus ? [focus] : NO_NOTES;
  }, [need, browse.pageItems, selectedUuid]);
  const shown = useNoteBodies({
    notes: browse.pageItems,
    pageItems: browse.pageItems,
    wanted,
    upcoming: need === BodyCookie.ON ? browse.nextItems : NO_NOTES,
    isActive: need !== BodyCookie.OFF,
  });

  const open = (note: Note) => router.push(itemHref(ItemTypes.NOTE, note.uuid));
  const selected = shown.find((note) => note.uuid === selectedUuid) || shown[0];

  return (
    <BrowseShell
      scope={BrowseScope.NOTES}
      isEmpty={!browse.size}
      kicker={t("browse.notesKicker", {
        notesCount: browse.size,
        notes: compact(browse.size),
        pinned: compact(browse.pinned),
      })}
      filters={NOTE_FILTERS}
      defaultFilter={defaultFilter}
      categories={categories}
      browse={browse}
      onCreate={() => openCreateNoteModal()}
    >
      {viewMode === ViewMode.LIST ? (
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
            {shown.map((note) => (
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
          notes={shown}
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
