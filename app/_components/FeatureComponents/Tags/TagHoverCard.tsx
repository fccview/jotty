"use client";

import { Note, Checklist } from "@/app/_types";
import { File02Icon, CheckmarkSquare04Icon } from "hugeicons-react";
import { useRouter } from "next/navigation";
import { buildCategoryPath } from "@/app/_utils/global-utils";
import { capitalize } from "lodash";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useTranslations } from "next-intl";

interface TagHoverCardProps {
  notes: Note[];
  checklists: Partial<Checklist>[];
}

export const TagHoverCard = ({ notes, checklists }: TagHoverCardProps) => {
  const router = useRouter();
  const { appSettings } = useAppMode();
  const t = useTranslations();

  const handleNoteClick = (e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(
      `/note/${buildCategoryPath(note.category || "Uncategorized", note.id)}`,
    );
  };

  const handleChecklistClick = (
    e: React.MouseEvent,
    list: Partial<Checklist>,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(
      `/checklist/${buildCategoryPath(list.category || "Uncategorized", list.id!)}`,
    );
  };

  const showSectionLabels = notes.length > 0 && checklists.length > 0;

  return (
    <div className="bg-card border border-border rounded-jotty shadow-lg p-2 min-w-[300px] max-w-[400px]">
      <div className="max-h-64 overflow-y-auto space-y-1">
        {showSectionLabels && notes.length > 0 && (
          <p className="text-xs text-muted-foreground px-1 pb-0.5">
            {t("notes.title")}
          </p>
        )}
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
              <span className="text-sm lg:text-xs font-medium text-foreground bg-primary/30 px-2 py-0.5 rounded-jotty flex-shrink-0">
                {note.category.split("/").pop()}
              </span>
            )}
          </button>
        ))}

        {showSectionLabels && checklists.length > 0 && (
          <p className="text-xs text-muted-foreground px-1 pb-0.5 pt-1">
            {t("checklists.title")}
          </p>
        )}
        {checklists.map((list) => (
          <button
            key={list.uuid ?? list.id}
            onClick={(e) => handleChecklistClick(e, list)}
            className="inline-flex items-center justify-between gap-1.5 w-full px-2 py-1 bg-primary/10 border border-primary/20 rounded-jotty hover:bg-primary/15 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <CheckmarkSquare04Icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-md lg:text-sm font-medium text-foreground truncate">
                {list.title || ""}
              </span>
            </div>
            {list.category && (
              <span className="text-sm lg:text-xs font-medium text-foreground bg-primary/30 px-2 py-0.5 rounded-jotty flex-shrink-0">
                {list.category.split("/").pop()}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
