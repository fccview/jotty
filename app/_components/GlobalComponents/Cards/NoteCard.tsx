"use client";

import { Clock, Tag, Type } from "lucide-react";
import { Note } from "@/app/_types";
import { formatRelativeTime } from "@/app/_utils/date-utils";
import { useMemo } from "react";
import { useSettings } from "@/app/_utils/settings-store";
import { convertMarkdownToHtml } from "@/app/_utils/markdown-utils";
import { UnifiedMarkdownRenderer } from "../../FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";

interface NoteCardProps {
  note: Note;
  onSelect: (note: Note) => void;
}

export const NoteCard = ({ note, onSelect }: NoteCardProps) => {
  const { showMarkdownPreview } = useSettings();

  const { previewText, wordCount } = useMemo(() => {
    const content = note.content || "";
    const plainText = content
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[#*_`~>]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    const words = plainText.split(/\s+/).filter(Boolean);

    return {
      previewText:
        plainText.length > 550
          ? plainText.substring(0, 550) + "..."
          : plainText,
      wordCount: words.length,
    };
  }, [note.content]);

  const renderedContent = useMemo(
    () => convertMarkdownToHtml(note.content || ""),
    [note.content]
  );

  const categoryName = useMemo(() => {
    return note.category ? note.category.split("/").pop() : null;
  }, [note.category]);

  return (
    <div
      onClick={() => onSelect(note)}
      className="bg-card border border-border rounded-xl cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/50 group flex flex-col overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-border/70">
        <h3 className="font-bold text-lg text-foreground group-hover:text-foreground/80 transition-colors truncate">
          {note.title}
        </h3>
      </div>

      <div className="px-5 py-4 relative max-h-64 overflow-hidden">
        {showMarkdownPreview ? (
          <div className="transition-opacity duration-300 opacity-70 group-hover:opacity-100">
            <UnifiedMarkdownRenderer content={note.content || ""} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground transition-opacity duration-300 opacity-70 group-hover:opacity-100">
            {previewText}
          </p>
        )}
        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
      </div>

      <div className="px-5 py-3 border-t border-border/70 text-xs text-muted-foreground flex items-center justify-between">
        <div className="flex items-center gap-2">
          {categoryName && (
            <>
              <Tag className="h-3 w-3" />
              <span className="bg-muted px-2 py-0.5 rounded">
                {categoryName}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-1.5"
            title={`${wordCount} words`}
          >
            <Type className="h-3 w-3" />
            <span>{wordCount} words</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(note.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
