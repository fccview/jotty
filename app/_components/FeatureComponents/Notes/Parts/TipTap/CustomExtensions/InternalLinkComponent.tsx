"use client";

import React, { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { FileText, CheckSquare, BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { getNoteById } from "@/app/_server/actions/note";
import { getListById } from "@/app/_server/actions/checklist";
import { buildCategoryPath, decodeCategoryPath } from "@/app/_utils/global-utils";
import { capitalize } from "lodash";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { NoteCard } from "@/app/_components/GlobalComponents/Cards/NoteCard";
import { ChecklistCard } from "@/app/_components/GlobalComponents/Cards/ChecklistCard";
import { Checklist, Note } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";

interface InternalLinkComponentProps {
  node: {
    attrs: {
      href: string;
      title: string;
      type: string;
      category: string;
      uuid: string;
    };
  };
}

const _returnNote = async (uuid: string, router: any, note?: Note) => {
  const finalNote = note || await getNoteById(uuid);

  if (finalNote) {
    router.push(`/note/${buildCategoryPath(finalNote.category || "Uncategorized", finalNote.id)}`);
    return;
  }

  return undefined;
};

const _returnChecklist = async (uuid: string, router: any, checklist?: Checklist) => {
  const finalChecklist = checklist || await getListById(uuid);

  if (finalChecklist) {
    router.push(`/checklist/${buildCategoryPath(finalChecklist.category || "Uncategorized", finalChecklist.id)}`);
    return;
  }
  return undefined;
};

export const InternalLinkComponent = ({ node }: InternalLinkComponentProps) => {
  const router = useRouter();
  const { href, title, uuid } = node.attrs;
  const [showPopup, setShowPopup] = useState(false);
  const potentialCategory = href?.replace("/jotty/", "").replace("/note/", "").replace("/checklist/", "").split("/").slice(1, -1).join("/");
  const { appSettings, notes, checklists } = useAppMode();

  const fullItem = notes.find((n) =>
    n.uuid === uuid) as Note | undefined
    || checklists.find((c) => c.uuid === uuid) as Checklist | undefined;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!href) return;

    if (href.startsWith("/jotty/")) {
      const uuidFromPath = href.replace("/jotty/", "");

      if (fullItem) {
        router.push(`/${fullItem && "type" in fullItem && fullItem.type ?
          ItemTypes.CHECKLIST : ItemTypes.NOTE}/${buildCategoryPath(fullItem.category || "Uncategorized", fullItem.id)}`);
        return;
      }

      try {
        await _returnNote(uuidFromPath, router);
        return;
      } catch (error) {
        console.warn("Failed to resolve /jotty/ link:", error);
      }
      try {
        await _returnChecklist(uuidFromPath, router);
        return;
      } catch (error) {
        console.warn("Failed to resolve /jotty/ link:", error);
      }
    } else {
      router.push(href);
      return;
    }
  };

  return (
    <NodeViewWrapper
      as="span"
      onClick={handleClick}
      onMouseEnter={() => {
        setShowPopup(true);
      }}
      onMouseLeave={() => {
        setShowPopup(false);
      }}
      className="inline-flex items-center gap-1.5 mx-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded-md hover:bg-primary/15 transition-colors cursor-pointer group relative"
    >
      {showPopup && href && href.startsWith("/jotty/") && (
        <span className="block absolute top-[110%] left-0 min-w-[300px] max-w-[400px] z-10">
          {fullItem && "type" in fullItem && fullItem.type ? (
            <ChecklistCard list={fullItem as Checklist} onSelect={() => { }} />
          ) : (
            <NoteCard note={fullItem as Note} onSelect={() => { }} fullScrollableContent />
          )}
        </span>
      )}
      <span className="flex-shrink-0">
        {fullItem && "type" in fullItem && fullItem.type ? (
          <>
            {fullItem.type === "task" ? <BarChart3 className="h-5 w-5" /> : <CheckSquare className="h-5 w-5" />}
          </>
        ) : (
          <FileText className="h-5 w-5" />
        )}
      </span>
      <span className="text-sm font-medium text-foreground">
        {appSettings?.parseContent === "yes"
          ? title
          : capitalize(title.replace(/-/g, " "))}
      </span>
      ·
      <span className="text-sm font-medium text-foreground bg-primary/30 px-2 py-0.5 rounded-md">
        {fullItem?.category || decodeCategoryPath(potentialCategory) || "not-found"}
      </span>
    </NodeViewWrapper>
  );
};
