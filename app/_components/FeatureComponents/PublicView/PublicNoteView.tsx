"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Note } from "@/app/_types";
import type { PublicLinks } from "@/app/_types/relations";
import { PublicUser } from "@/app/_utils/user-sanitize-utils";
import { NOTE_PROSE_CLASS } from "@/app/_consts/notes";
import { UnifiedMarkdownRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";
import { PrintView } from "@/app/_components/FeatureComponents/Notes/Parts/PrintView";
import { PublicEncryptedNote } from "./Parts/PublicEncryptedNote";
import { PublicPaper } from "./Parts/PublicPaper";

const PRINT_MODE = "print";

interface PublicNoteViewProps {
  note: Note;
  user: PublicUser | null;
  links: PublicLinks;
}

export const PublicNoteView = ({ note, user, links }: PublicNoteViewProps) => {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);

  if (searchParams.get("view_mode") === PRINT_MODE) {
    return <PrintView note={note} />;
  }

  return (
    <PublicPaper
      title={note.title}
      user={user}
      category={note.category}
      updatedAt={note.updatedAt}
      footer={t("notes.sharedPubliclyBy", { owner: note.owner ?? "" })}
      links={links}
      hasContents
    >
      {note.encrypted && !decryptedContent ? (
        <PublicEncryptedNote content={note.content} onDecrypted={setDecryptedContent} />
      ) : (
        <UnifiedMarkdownRenderer content={decryptedContent || note.content} className={NOTE_PROSE_CLASS} />
      )}
    </PublicPaper>
  );
};
