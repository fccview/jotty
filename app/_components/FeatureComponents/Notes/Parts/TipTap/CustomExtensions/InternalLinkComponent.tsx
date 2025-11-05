import React, { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { FileText, CheckSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { getNoteById } from "@/app/_server/actions/note";
import { Checklist, ItemType, Note } from "@/app/_types";
import { getListById } from "@/app/_server/actions/checklist";
import { NoteCard } from "@/app/_components/GlobalComponents/Cards/NoteCard";
import { ChecklistCard } from "@/app/_components/GlobalComponents/Cards/ChecklistCard";
import { decodeCategoryPath } from "@/app/_utils/global-utils";
import { capitalize } from "lodash";
import { ItemTypes } from "@/app/_types/enums";
import { useAppMode } from "@/app/_providers/AppModeProvider";

interface InternalLinkComponentProps {
  node: {
    attrs: {
      href: string;
      title: string;
      type: ItemType;
      category: string | null;
    };
  };
}

export const InternalLinkComponent = ({ node }: InternalLinkComponentProps) => {
  const router = useRouter();
  const { href, title, type, category } = node.attrs;
  const [fullNote, setFullNote] = useState<Note | undefined>(undefined);
  const [fullList, setFullList] = useState<Checklist | undefined>(undefined);
  const [showPopup, setShowPopup] = useState(false);
  const { appSettings } = useAppMode();
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!href) return;


    const parts = href.split("/");
    const type = parts[1];
    const categoryAndId = parts.slice(2).join("/");
    const lastSlashIndex = categoryAndId.lastIndexOf("/");
    const encodedCategoryPath = lastSlashIndex > 0 ? categoryAndId.substring(0, lastSlashIndex) : "";
    const id = categoryAndId.substring(lastSlashIndex + 1);

    const decodedCategoryPath = decodeCategoryPath(encodedCategoryPath);
    const decodedHref = `/${type}/${decodedCategoryPath ? `${decodedCategoryPath}/` : ""}${id}`;

    router.push(decodedHref.toLowerCase().replace("uncategorized/", ""));
  };

  const fetchFullItem = async () => {
    if (type === ItemTypes.NOTE) {
      const note = await getNoteById(
        href.split("/").pop() || "",
        decodeCategoryPath(category || "") || undefined
      );
      setFullNote(note);
    } else {
      const list = await getListById(
        href.split("/").pop() || "",
        undefined,
        decodeCategoryPath(category || "") || undefined
      );
      setFullList(list);
    }
  };

  return (
    <NodeViewWrapper
      as="span"
      onClick={handleClick}
      onMouseEnter={() => {
        fetchFullItem();
        setShowPopup(true);
      }}
      onMouseLeave={() => {
        setShowPopup(false);
      }}
      className="inline-flex items-center gap-1.5 mx-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded-md hover:bg-primary/15 transition-colors cursor-pointer group relative"
    >
      {showPopup && (
        <span className="block absolute top-[110%] left-0 min-w-[300px] max-w-[400px] z-10">
          {fullNote && (
            <NoteCard
              note={fullNote}
              onSelect={() => { }}
              fullScrollableContent
            />
          )}

          {fullList && <ChecklistCard list={fullList} onSelect={() => { }} />}
        </span>
      )}
      <span className="flex-shrink-0">
        {type === ItemTypes.NOTE ? (
          <FileText className="h-3 w-3 text-foreground" />
        ) : (
          <CheckSquare className="h-3 w-3 text-foreground" />
        )}
      </span>
      <span className="text-sm font-medium text-foreground">{appSettings?.parseContent === "yes" ? title : capitalize(title.replace(/-/g, ' '))}</span>


      <span className="text-xs text-muted-foreground">•</span>
      <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
        {decodeCategoryPath(category || "Uncategorized").split("/").pop()}
      </span>
    </NodeViewWrapper>
  );
};
