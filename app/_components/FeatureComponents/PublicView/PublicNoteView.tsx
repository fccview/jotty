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
import { PanelAside, PanelSheet } from "@/app/_components/FeatureComponents/Notes/Parts/NotePanel/NotePanel";
import { ReadingProgressBar } from "@/app/_components/GlobalComponents/Layout/ReadingProgressBar";
import { PublicNoteHeader } from "./Parts/PublicNoteHeader";
import { PublicEncryptedNote } from "./Parts/PublicEncryptedNote";
import { PublicPanelBody } from "./Parts/PublicPanelBody";

const PRINT_MODE = "print";

interface PublicNoteViewProps {
  note: Note;
  user: PublicUser | null;
  links: PublicLinks;
}

export const PublicNoteView = ({ note, user, links }: PublicNoteViewProps) => {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [showPanel, setShowPanel] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);

  if (searchParams.get("view_mode") === PRINT_MODE) {
    return <PrintView note={note} />;
  }

  const isLocked = note.encrypted && !decryptedContent;

  return (
    <div className="min-h-screen bg-background relative flex">
      <div className="flex-1 min-w-0">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <ReadingProgressBar fixed />
          <PublicNoteHeader
            note={note}
            user={user}
            showPanel={showPanel}
            onTogglePanel={() => setShowPanel(!showPanel)}
            onOpenSheet={() => setShowSheet(true)}
          />

          <div className="bg-card border border-border rounded-jotty p-6">
            {isLocked ? (
              <PublicEncryptedNote content={note.content} onDecrypted={setDecryptedContent} />
            ) : (
              <UnifiedMarkdownRenderer content={decryptedContent || note.content} className={NOTE_PROSE_CLASS} />
            )}
          </div>

          <div className="mt-12 pt-8 border-t border-border text-center no-print">
            <p className="text-md lg:text-sm text-muted-foreground">
              {t("notes.sharedPubliclyBy", { owner: note.owner ?? "" })}
            </p>
          </div>
        </div>
      </div>

      {showPanel && (
        <div className="no-print hidden lg:flex sticky top-0 h-[100dvh] self-start">
          <PanelAside onClose={() => setShowPanel(false)}>
            {(close) => <PublicPanelBody links={links} trailing={close} />}
          </PanelAside>
        </div>
      )}

      {showSheet && (
        <PanelSheet onClose={() => setShowSheet(false)}>{() => <PublicPanelBody links={links} />}</PanelSheet>
      )}
    </div>
  );
};
