"use client";

import { Clock, Type, Pin, PinOff } from "lucide-react";
import { Note } from "@/app/_types";
import { formatRelativeTime } from "@/app/_utils/date-utils";
import { useMemo } from "react";
import { useSettings } from "@/app/_utils/settings-store";
import { convertMarkdownToHtml } from "@/app/_utils/markdown-utils";
import { UnifiedMarkdownRenderer } from "../../FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface NoteCardProps {
  note: Note;
  onSelect: (note: Note) => void;
  isPinned?: boolean;
  onTogglePin?: (note: Note) => void;
  isDraggable?: boolean;
}

export const NoteCard = ({ note, onSelect, isPinned = false, onTogglePin, isDraggable = false }: NoteCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: note.id,
    disabled: !isDraggable
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
      ref={setNodeRef}
      style={style}
      {...(isDraggable ? { ...attributes, ...listeners } : {})}
      onClick={() => onSelect(note)}
      className={`bg-card border border-border rounded-xl cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/50 group flex flex-col overflow-hidden h-fit ${isDragging ? 'opacity-50' : ''
        }`}
    >
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">
              {note.title}
            </h3>
          </div>
          {onTogglePin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(note);
              }}
              className={`${isPinned ? "opacity-100" : "opacity-0"} group-hover:opacity-100 transition-opacity p-1.5 hover:bg-muted rounded-lg flex-shrink-0`}
              title={isPinned ? "Unpin" : "Pin"}
            >
              {isPinned ? (
                <PinOff className="h-4 w-4 text-muted-foreground hover:text-primary" />
              ) : (
                <Pin className="h-4 w-4 text-muted-foreground hover:text-primary" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 flex-1">
        <div className="relative">
          {showMarkdownPreview ? (
            <div className="text-sm text-muted-foreground prose prose-sm max-w-none">
              <div className="line-clamp-4 [&>*]:!my-1 [&>h1]:!text-sm [&>h2]:!text-sm [&>h3]:!text-sm [&>h4]:!text-sm [&>h5]:!text-sm [&>h6]:!text-sm [&>p]:!text-sm [&>ul]:!text-sm [&>ol]:!text-sm [&>li]:!text-sm [&>blockquote]:!text-sm [&>code]:!text-xs [&>pre]:!text-xs [&>pre]:!p-2 [&>img]:!max-h-32 [&>img]:!object-cover [&>img]:!rounded">
                <UnifiedMarkdownRenderer content={note.content || ""} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
              {previewText}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 py-3 bg-muted/30 border-t border-border/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {categoryName && (
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-md font-medium">
                {categoryName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Type className="h-3 w-3" />
              <span>{wordCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatRelativeTime(note.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
