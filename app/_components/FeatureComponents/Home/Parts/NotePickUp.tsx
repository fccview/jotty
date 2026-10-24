"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Note } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { isNoteEncrypted, noteExcerptOf } from "@/app/_utils/note-display-utils";
import { useItemSharing } from "@/app/_hooks/useItemSharing";
import { SealedPanel } from "@/app/_components/GlobalComponents/Cards/Parts/SealedPanel";
import { AvatarStack } from "@/app/_components/GlobalComponents/User/AvatarStack";
import { PickUpCard } from "./PickUpCard";

const PEOPLE_LIMIT = 4;

export const NotePickUp = ({ note, onOpen }: { note: Note; onOpen: () => void }) => {
  const t = useTranslations();
  const { people } = useItemSharing(note.uuid, Modes.NOTES);
  const excerpt = useMemo(() => (isNoteEncrypted(note) ? "" : noteExcerptOf(note)), [note]);

  return (
    <PickUpCard
      title={note.title}
      category={note.category}
      updatedAt={note.updatedAt}
      actionLabel={t("browse.continueWriting")}
      onOpen={onOpen}
      footer={
        <AvatarStack
          usernames={note.sharedFrom ? [note.sharedFrom] : people}
          limit={PEOPLE_LIMIT}
          size="sm"
        />
      }
    >
      {isNoteEncrypted(note) ? (
        <SealedPanel />
      ) : (
        <p className="text-md lg:text-sm text-muted-foreground leading-relaxed line-clamp-4">
          {excerpt}
        </p>
      )}
    </PickUpCard>
  );
};
