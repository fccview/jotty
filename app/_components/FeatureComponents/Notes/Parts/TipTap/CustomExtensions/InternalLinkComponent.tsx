"use client";

import React, { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import {
  File02Icon,
  CheckmarkSquare04Icon,
  TaskDaily01Icon,
  FileLinkIcon,
  Attachment01Icon,
} from "hugeicons-react";
import { useRouter } from "next/navigation";
import { getNoteById } from "@/app/_server/actions/note";
import { getListById } from "@/app/_server/actions/checklist";
import {
  buildCategoryPath,
  decodeCategoryPath,
  encodeCategoryPath,
} from "@/app/_utils/global-utils";
import { capitalize } from "lodash";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { NoteCard } from "@/app/_components/GlobalComponents/Cards/NoteCard";
import { ChecklistCard } from "@/app/_components/GlobalComponents/Cards/ChecklistCard";
import { Checklist, Note } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { encodeId } from "@/app/_utils/global-utils";

interface InternalLinkComponentProps {
  node: {
    attrs: {
      href: string;
      title: string;
      type: string;
      category: string;
      uuid: string;
      itemId: string;
      convertToBidirectional: boolean;
    };
  };
  editor: any;
  updateAttributes: (attrs: Record<string, any>) => void;
}

const _returnNote = async (uuid: string, router: any, note?: Note) => {
  const finalNote = note || (await getNoteById(uuid));

  if (finalNote) {
    router.push(
      `/note/${buildCategoryPath(
        finalNote.category || "Uncategorized",
        finalNote.id
      )}`
    );
    return;
  }

  return undefined;
};

const _returnChecklist = async (
  uuid: string,
  router: any,
  checklist?: Checklist
) => {
  const finalChecklist = checklist || (await getListById(uuid));

  if (finalChecklist) {
    router.push(
      `/checklist/${buildCategoryPath(
        finalChecklist.category || "Uncategorized",
        finalChecklist.id
      )}`
    );
    return;
  }
  return undefined;
};

export const InternalLinkComponent = ({
  node,
  editor,
  updateAttributes,
}: InternalLinkComponentProps) => {
  const router = useRouter();
  const { href, title, uuid, itemId, type, category, convertToBidirectional } =
    node.attrs;
  const [showPopup, setShowPopup] = useState(false);
  const potentialCategory = href
    ?.replace("/jotty/", "")
    .replace("/note/", "")
    .replace("/checklist/", "")
    .split("/")
    .slice(1, -1)
    .join("/");
  const { appSettings, notes, checklists } = useAppMode();

  const isEditable = editor?.isEditable ?? false;
  const isPathBasedLink =
    href?.startsWith("/note/") || href?.startsWith("/checklist/");
  const isJottyLink = href?.startsWith("/jotty/");

  const canToggle = isPathBasedLink || isJottyLink;

  const fullItem =
    (notes.find((n) => n.uuid === uuid) as Note | undefined) ||
    (checklists.find((c) => c.uuid === uuid) as Checklist | undefined);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!href) return;

    if (href.startsWith("/jotty/")) {
      const uuidFromPath = href.replace("/jotty/", "");

      if (fullItem) {
        router.push(
          `/${
            fullItem && "type" in fullItem && fullItem.type
              ? ItemTypes.CHECKLIST
              : ItemTypes.NOTE
          }/${buildCategoryPath(
            fullItem.category || "Uncategorized",
            fullItem.id
          )}`
        );
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

  const handleToggleConversion = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isJottyLink) {
      if (fullItem) {
        const pathPrefix =
          fullItem && "type" in fullItem && fullItem.type
            ? "/checklist/"
            : "/note/";
        const newHref = `${pathPrefix}${buildCategoryPath(
          fullItem.category || "Uncategorized",
          fullItem.id
        )}`;
        updateAttributes({
          href: newHref,
          type:
            fullItem && "type" in fullItem && fullItem.type
              ? "checklist"
              : "note",
          category: fullItem.category || "Uncategorized",
          itemId: fullItem.id,
          convertToBidirectional: false,
        });
      } else if (itemId && category) {
        const pathPrefix = type === "checklist" ? "/checklist/" : "/note/";
        const newHref = `${pathPrefix}${buildCategoryPath(category, itemId)}`;
        updateAttributes({
          href: newHref,
          convertToBidirectional: false,
        });
      } else {
        console.warn("Cannot convert jotty to path - missing data");
      }
    } else if (isPathBasedLink) {
      if (uuid) {
        updateAttributes({
          href: `/jotty/${uuid}`,
          convertToBidirectional: false,
        });
      } else if (itemId && category) {
        const foundItem =
          notes.find(
            (n) =>
              encodeId(n.id || "") === encodeId(itemId) &&
              encodeCategoryPath(n?.category || "") ===
                encodeCategoryPath(category)
          ) ||
          checklists.find(
            (c) =>
              encodeId(c.id || "") === encodeId(itemId) &&
              encodeCategoryPath(c?.category || "") ===
                encodeCategoryPath(category)
          );

        if (foundItem?.uuid) {
          updateAttributes({
            href: `/jotty/${foundItem.uuid}`,
            uuid: foundItem.uuid,
            convertToBidirectional: false,
          });
        } else {
          console.log("Could not find item to convert");
        }
      } else {
        console.log("Missing itemId or category");
      }
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
      {showPopup &&
        href &&
        (href.startsWith("/jotty/") ||
          href.startsWith("/note/") ||
          href.startsWith("/checklist/")) && (
          <span className="block absolute top-[110%] left-0 min-w-[300px] max-w-[400px] z-10">
            {fullItem && "type" in fullItem && fullItem.type ? (
              <ChecklistCard list={fullItem as Checklist} onSelect={() => {}} />
            ) : (
              <NoteCard
                note={fullItem as Note}
                onSelect={() => {}}
                fullScrollableContent
              />
            )}
          </span>
        )}
      <span className="flex-shrink-0">
        {fullItem && "type" in fullItem && fullItem.type ? (
          <>
            {fullItem.type === "task" ? (
              <TaskDaily01Icon className="h-5 w-5" />
            ) : (
              <CheckmarkSquare04Icon className="h-5 w-5" />
            )}
          </>
        ) : (
          <File02Icon className="h-5 w-5" />
        )}
      </span>
      <span className="text-sm font-medium text-foreground">
        {appSettings?.parseContent === "yes"
          ? title
          : capitalize(title.replace(/-/g, " "))}
      </span>
      ·
      <span className="text-sm font-medium text-foreground bg-primary/30 px-2 py-0.5 rounded-md">
        {fullItem?.category ||
          decodeCategoryPath(potentialCategory) ||
          "not-found"}
      </span>
      {isEditable && (isPathBasedLink || canToggle) && (
        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border">
          <span className="text-xs text-muted-foreground">Link Type:</span>
          <button
            onClick={handleToggleConversion}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              isJottyLink
                ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-500/30 border border-blue-500/30"
                : convertToBidirectional
                ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-500/30 border border-blue-500/30"
                : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
            }`}
            title={
              isJottyLink
                ? "Click to convert to path-based link (cross-platform compatible)"
                : convertToBidirectional
                ? "Will convert to bidirectional UUID link on save (enables backlinks)"
                : "Click to convert to bidirectional UUID link (enables backlinks)"
            }
          >
            {isJottyLink || convertToBidirectional ? (
              <>
                <FileLinkIcon className="h-3.5 w-3.5" />
                <span>Bidirectional</span>
              </>
            ) : (
              <>
                <Attachment01Icon className="h-3.5 w-3.5" />
                <span>Path-Based</span>
              </>
            )}
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
};
