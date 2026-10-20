"use client";

import { useNoteStatLabels } from "@/app/_hooks/useNoteStatLabels";

const STATS_SEPARATOR = "·";

interface NoteFooterStatsProps {
  content: string;
}

export const NoteFooterStats = ({ content }: NoteFooterStatsProps) => {
  const labels = useNoteStatLabels(content);

  if (!content.trim()) {
    return null;
  }

  return (
    <div className="jotty-note-stats mt-12 pt-4 border-t border-border no-print">
      <span>{labels.words}</span>
      <span className="jotty-note-stats-sep" aria-hidden="true">
        {STATS_SEPARATOR}
      </span>
      <span>{labels.chars}</span>
      <span className="jotty-note-stats-sep" aria-hidden="true">
        {STATS_SEPARATOR}
      </span>
      <span>{labels.reading}</span>
    </div>
  );
};
