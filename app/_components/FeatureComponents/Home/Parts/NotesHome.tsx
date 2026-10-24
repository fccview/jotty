"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Note, SanitisedUser, TagInfo } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { CreatePrefill } from "@/app/_providers/ShortcutsProvider";
import { useQuickValue } from "@/app/_hooks/settings/useQuickSetting";
import { QuickSettingId } from "@/app/_consts/quick-settings";
import { newestFirst } from "@/app/_utils/order-utils";
import { getNotesForDisplay } from "@/app/_server/actions/note";
import { useHomeFeed } from "@/app/_hooks/useHomeFeed";
import { usePins } from "@/app/_hooks/usePins";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";
import { NOTE_CARD_COLUMNS } from "@/app/_consts/columns";
import { NoteCard } from "@/app/_components/GlobalComponents/Cards/NoteCard";
import { PinnedNoteCard } from "@/app/_components/GlobalComponents/Cards/PinnedNoteCard";
import { NoteItems } from "@/app/_components/GlobalComponents/Cards/NoteItems";
import { ItemsEmpty } from "@/app/_components/GlobalComponents/Cards/ItemsEmpty";
import { EmptyActions } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import { EmptyIllustrations } from "@/app/_components/GlobalComponents/Cards/Parts/EmptyIllustration";
import { SectionHeading } from "@/app/_components/GlobalComponents/Layout/SectionHeading";
import { ViewModeSwitch } from "@/app/_components/GlobalComponents/Buttons/ViewModeSwitch";
import { ShowAllButton } from "@/app/_components/GlobalComponents/Buttons/ShowAllButton";
import { HomeTop } from "./HomeTop";
import { HomeFrame } from "./HomeFrame";
import { FeedLoading, FeedTail } from "./HomeFeedStatus";
import { NotePickUp } from "./NotePickUp";

const PROMPTS = "browse.notePrompts";
const NOTES_FRAME = "flex-1";

const noteTagCount = (tag: TagInfo) => tag.noteCount;

interface NotesHomeProps {
  notes: Note[];
  user: SanitisedUser | null;
  onCreate: (category?: string, prefill?: CreatePrefill) => void;
  onSelectNote: (note: Note) => void;
}

export const NotesHome = ({ notes, user, onCreate, onSelectNote }: NotesHomeProps) => {
  const t = useTranslations();
  const compact = useCompactNumber();
  const viewMode = useQuickValue(QuickSettingId.VIEW_MODE);
  const { library } = useAppMode();
  const feed = useHomeFeed<Note>(getNotesForDisplay);
  const pins = usePins(notes, user?.pinnedNotes, ItemTypes.NOTE);

  const lastEdited = useMemo(() => [...notes].sort(newestFirst)[0], [notes]);

  const recent = useMemo(() => {
    if (feed.filter) return feed.items;
    return notes
      .filter((note) => !pins.isPinned(note) && note.uuid !== lastEdited?.uuid)
      .sort(newestFirst);
  }, [feed.filter, feed.items, notes, pins, lastEdited]);

  if (!library.notes) {
    return (
      <HomeFrame className={NOTES_FRAME} isBare>
        <ItemsEmpty
          kind={EmptyIllustrations.NOTES}
          action={EmptyActions.CREATE}
          onAction={() => onCreate()}
        />
      </HomeFrame>
    );
  }

  return (
    <HomeFrame className={NOTES_FRAME}>
      <HomeTop
        user={user}
        type={ItemTypes.NOTE}
        promptsKey={PROMPTS}
        newLabel={t("notes.newNote")}
        createInKey="browse.newNoteIn"
        summary={t("browse.notesSummary", {
          notesCount: library.notes,
          notes: compact(library.notes),
          pinned: compact(pins.pinned.length),
          encrypted: compact(library.encryptedNotes),
        })}
        pickUp={
          lastEdited && <NotePickUp note={lastEdited} onOpen={() => onSelectNote(lastEdited)} />
        }
        pinned={pins.pinned}
        pinnedColumns={NOTE_CARD_COLUMNS}
        tagCount={noteTagCount}
        onCreate={onCreate}
        renderPin={(note, position, isBoard) =>
          isBoard ? (
            <PinnedNoteCard
              note={note}
              position={position}
              onSelect={onSelectNote}
              onTogglePin={pins.toggle}
            />
          ) : (
            <NoteCard note={note} onSelect={onSelectNote} isPinned onTogglePin={pins.toggle} />
          )
        }
      />

      <FeedLoading feed={feed} />

      {recent.length > 0 && (
        <div className="mb-8">
          <SectionHeading title={feed.filter ? t("notes.title") : t("notes.recent")}>
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
          <FeedTail feed={feed} />
        </div>
      )}
    </HomeFrame>
  );
};
