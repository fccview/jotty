"use client";

import { Note } from "@/app/_types";
import { File02Icon } from "hugeicons-react";
import { useRouter } from "next/navigation";
import { buildCategoryPath } from "@/app/_utils/global-utils";
import { capitalize } from "lodash";
import { useAppMode } from "@/app/_providers/AppModeProvider";

interface TagHoverCardProps {
  notes: Note[];
}

export const TagHoverCard = ({ notes }: TagHoverCardProps) => {
  const router = useRouter();
  const { appSettings } = useAppMode();

  const handleNoteClick = (e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(
      `/note/${buildCategoryPath(note.category || "Uncategorized", note.id)}`
    );
  };

  return (
    <div className="bg-card border border-border rounded-jotty shadow-lg p-2 min-w-[300px] max-w-[400px]">
      <div className="max-h-64 overflow-y-auto space-y-1">
        {notes.map((note) => (
          <button
            key={note.uuid}
            onClick={(e) => handleNoteClick(e, note)}
            className="inline-flex items-center justify-between gap-1.5 w-full px-2 py-1 bg-primary/10 border border-primary/20 rounded-jotty hover:bg-primary/15 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <File02Icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-md lg:text-sm font-medium text-foreground truncate">
                {appSettings?.parseContent === "yes"
                  ? note.title
                  : capitalize((note.title || "").replace(/-/g, " "))}
              </span>
            </div>
            {note.category && (
              <>
                <span className="text-sm lg:text-xs font-medium text-foreground bg-primary/30 px-2 py-0.5 rounded-jotty flex-shrink-0">
                  {note.category.split("/").pop()}
                </span>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
