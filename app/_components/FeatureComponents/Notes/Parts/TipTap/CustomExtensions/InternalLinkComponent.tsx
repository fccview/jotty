import React, { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { FileText, CheckSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { getNoteById, getNoteByUuid, getNoteMetadataByUuid } from "@/app/_server/actions/note";
import { Checklist, ItemType, Note } from "@/app/_types";
import { getListById } from "@/app/_server/actions/checklist";
import { NoteCard } from "@/app/_components/GlobalComponents/Cards/NoteCard";
import { ChecklistCard } from "@/app/_components/GlobalComponents/Cards/ChecklistCard";
import { decodeCategoryPath } from "@/app/_utils/global-utils";
import { capitalize } from "lodash";
import { ItemTypes } from "@/app/_types/enums";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { resolveUuidToPath } from "@/app/_server/actions/link";
import { getCurrentUser } from "@/app/_server/actions/users";


// Function to ensure an item has a UUID before linking
export const ensureItemHasUuid = async (
  itemType: ItemType,
  itemId: string,
  category?: string
): Promise<string | null> => {
  const user = await getCurrentUser();

  try {
    const response = await fetch("/api/admin/migrate-links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": user?.apiKey || "ck_8ee78e125bbf48287c9f8814dd29cbad",
      },
      body: JSON.stringify({
        username: user?.username || "fccview",
        action: "ensure-uuid",
        itemType,
        itemId,
        category,
      }),
    });

    const result = await response.json();
    return result.success ? result.uuid : null;
  } catch (error) {
    console.error("Failed to ensure UUID:", error);
    return null;
  }
};

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
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
  const [resolvedTitle, setResolvedTitle] = useState<string>(title);
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [resolvedCategory, setResolvedCategory] = useState<string | null>(category);
  const { appSettings, user } = useAppMode();

  // Resolve UUID links directly by UUID
  React.useEffect(() => {
    const resolveLink = async () => {
      if (href.startsWith("jotty://")) {
        setIsResolving(true);
        const uuidPart = href.substring(8); // Remove "jotty://" prefix
        const colonIndex = uuidPart.indexOf(":");
        const uuid = colonIndex > 0 ? uuidPart.substring(colonIndex + 1) : uuidPart; // Extract UUID after type:
        try {
          const username = user?.username || "";

          // Get just metadata for display (fast)
          if (type === ItemTypes.NOTE) {
            const metadata = await getNoteMetadataByUuid(uuid, username);
            if (metadata) {
              setResolvedTitle(metadata.title);
              setResolvedCategory(metadata.category);
              setResolvedPath(metadata.path);
            }
          } else {
            // For checklists, we still need to use the old method since there's no getListByUuid
            const path = await resolveUuidToPath(username, uuid);
            if (path) {
              setResolvedPath(path);
              const parts = path.split("/");
              const itemId = parts[parts.length - 1];
              const categoryPath = parts.slice(0, -1).join("/");
              setResolvedCategory(categoryPath || "Uncategorized");

              const list = await getListById(
                itemId,
                username,
                categoryPath || undefined
              );
              setFullList(list);
              if (list) {
                setResolvedTitle(list.title);
              }
            }
          }
        } catch (error) {
          console.error("Failed to resolve UUID link:", error);
          // Keep original title if resolution fails
          setResolvedTitle(title);
        } finally {
          setIsResolving(false);
        }
      } else {
        // Legacy path-based link
        setResolvedPath(href);
        setResolvedTitle(title);
        setResolvedCategory(category);
        setIsResolving(false);
      }
    };

    resolveLink();
  }, [href, title, type, category]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!resolvedPath) return;

    const parts = resolvedPath.split("/");
    const itemId = parts[parts.length - 1];
    const categoryPath = parts.slice(0, -1).join("/");

    const decodedHref = `/${type}/${categoryPath ? `${categoryPath}/` : ""}${itemId}`;
    router.push(decodedHref.toLowerCase().replace("uncategorized/", ""));
  };

  const fetchFullItem = async () => {
    // For UUID links, fetch full content only when popup is shown
    if (href.startsWith("jotty://")) {
      const uuidPart = href.substring(8);
      const colonIndex = uuidPart.indexOf(":");
      const uuid = colonIndex > 0 ? uuidPart.substring(colonIndex + 1) : uuidPart;

      if (type === ItemTypes.NOTE) {
        const note = await getNoteByUuid(uuid, user?.username || "");
        setFullNote(note);
      } else {
        // For checklists, get the path first
        const username = user?.username || "";
        const path = await resolveUuidToPath(username, uuid);
        if (path) {
          const parts = path.split("/");
          const itemId = parts[parts.length - 1];
          const categoryPath = parts.slice(0, -1).join("/");
          const list = await getListById(itemId, username, categoryPath || undefined);
          setFullList(list);
        }
      }
    } else {
      // For legacy links, fetch item
      if (type === ItemTypes.NOTE) {
        const note = await getNoteById(
          href.split("/").pop() || "",
          decodeCategoryPath(category || "") || undefined
        );
        setFullNote(note);
      } else {
        const list = await getListById(
          href.split("/").pop() || "",
          user?.username || "",
          decodeCategoryPath(category || "") || undefined
        );
        setFullList(list);
      }
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
      <span className="text-sm font-medium text-foreground">
        {isResolving ? (
          <span className="inline-flex items-center">
            <span className="animate-pulse">Loading...</span>
          </span>
        ) : (
          appSettings?.parseContent === "yes" ? resolvedTitle : capitalize(resolvedTitle.replace(/-/g, ' '))
        )}
      </span>

      <span className="text-xs text-muted-foreground">•</span>
      <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
        {decodeCategoryPath(resolvedCategory || "Uncategorized").split("/").pop()}
      </span>
    </NodeViewWrapper>
  );
};
