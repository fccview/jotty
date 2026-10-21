"use client";

import { useTranslations } from "next-intl";
import { ArrowUpRight01Icon, Clock01Icon, Folder01Icon } from "hugeicons-react";
import { Note } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { formatRelativeTime } from "@/app/_utils/date-utils";
import { categoryTrail } from "@/app/_utils/category-path-utils";
import { hasNoteBody, isNoteEncrypted } from "@/app/_utils/note-display-utils";
import { useNoteStatLabels } from "@/app/_hooks/useNoteStatLabels";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { SealedPanel, SealedSize } from "@/app/_components/GlobalComponents/Cards/Parts/SealedPanel";
import { ItemShareMark } from "@/app/_components/GlobalComponents/Cards/Parts/ItemShareMark";
import {
  PinStateIcon,
  usePinLabel,
} from "@/app/_components/GlobalComponents/Cards/Parts/PinToggle";
import { WizardIcon } from "@/app/_components/GlobalComponents/Layout/CustomIcons/WizardIcon";
import { UnifiedMarkdownRenderer } from "./UnifiedMarkdownRenderer";

interface NotePreviewProps {
  note: Note;
  isPinned: boolean;
  onOpen: () => void;
  onTogglePin?: () => void;
}

export const NotePreview = ({ note, isPinned, onOpen, onTogglePin }: NotePreviewProps) => {
  const t = useTranslations();
  const trail = categoryTrail(note.category, t("notes.uncategorized"));
  const isEncrypted = isNoteEncrypted(note);
  const hasBody = hasNoteBody(note);
  const labels = useNoteStatLabels(
    isEncrypted || !hasBody ? "" : note.content || "",
    hasBody ? undefined : note.wordCount ?? 0,
  );
  const pinLabel = usePinLabel(isPinned);

  return (
    <article className="jotty-note-preview bg-card border border-border rounded-jotty overflow-hidden lg:sticky lg:top-0 [overflow-wrap:anywhere]">
      <div className="px-6 pt-5 pb-5 border-b border-border">
        <p className="font-mono text-xs text-muted-foreground flex items-center gap-1.5 min-w-0" title={trail}>
          <Folder01Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{trail}</span>
        </p>
        <h2 className="text-2xl font-bold mt-2 leading-tight text-foreground line-clamp-3" title={note.title}>
          {note.title}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {isEncrypted ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <WizardIcon className="h-3.5 w-3.5" />
              {t("encryption.encrypted")}
            </span>
          ) : (
            <>
              <span>{labels.words}</span>
              <span>{labels.reading}</span>
            </>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock01Icon className="h-3 w-3" />
            {formatRelativeTime(note.updatedAt, t)}
          </span>
          <ItemShareMark item={note} mode={Modes.NOTES} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" className="gap-2" onClick={onOpen}>
            <ArrowUpRight01Icon className="h-4 w-4" />
            {t("common.open")}
          </Button>
          {onTogglePin && (
            <Button variant="outline" size="sm" className="gap-2" onClick={onTogglePin}>
              <PinStateIcon isPinned={isPinned} className="h-4 w-4" />
              {pinLabel}
            </Button>
          )}
        </div>
      </div>
      <div className="px-6 py-5 max-h-[55vh] overflow-y-auto">
        {isEncrypted ? (
          <SealedPanel size={SealedSize.LG} />
        ) : hasBody ? (
          <UnifiedMarkdownRenderer content={note.content || ""} className="max-w-none" />
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">{note.excerpt}</p>
        )}
      </div>
      {!isEncrypted && (note.tags || []).length > 0 && (
        <div className="px-6 py-4 border-t border-border flex flex-wrap gap-2">
          {(note.tags || []).map((tag) => (
            <span key={tag} className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-jotty">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
};
