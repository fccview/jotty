"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { decodeCategoryPath, itemHref } from "@/app/_utils/global-utils";
import { capitalize } from "lodash";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { NoteCard } from "@/app/_components/GlobalComponents/Cards/NoteCard";
import { ChecklistCard } from "@/app/_components/GlobalComponents/Cards/ChecklistCard";
import { Checklist, Note } from "@/app/_types";
import { isKanbanType, ItemTypes } from "@/app/_types/enums";
import { useTranslations } from "next-intl";

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

  if (finalNote?.uuid) {
    router.push(itemHref(ItemTypes.NOTE, finalNote.uuid));
    return;
  }

  return undefined;
};

const _returnChecklist = async (
  uuid: string,
  router: any,
  checklist?: Checklist,
) => {
  const finalChecklist = checklist || (await getListById(uuid));

  if (finalChecklist?.uuid) {
    router.push(itemHref(ItemTypes.CHECKLIST, finalChecklist.uuid));
    return;
  }
  return undefined;
};

export const InternalLinkComponent = ({
  node,
  editor,
  updateAttributes,
}: InternalLinkComponentProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { href, title, uuid, itemId, type, category, convertToBidirectional } =
    node.attrs;
  const [showPopup, setShowPopup] = useState(false);
  const [loadedFullItem, setLoadedFullItem] = useState<Note | Checklist | null>(
    null,
  );
  const [isLoadingItem, setIsLoadingItem] = useState(false);
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

  const metadataItem =
    (notes.find((n) => n.uuid === uuid) as Partial<Note> | undefined) ||
    (checklists.find((c) => c.uuid === uuid) as Partial<Checklist> | undefined);

  const fullItem = loadedFullItem || metadataItem;

  const loadFullItem = useCallback(async () => {
    if (loadedFullItem || isLoadingItem || !uuid) return;

    setIsLoadingItem(true);
    try {
      const isChecklist =
        metadataItem && "type" in metadataItem && metadataItem.type;
      if (isChecklist) {
        const checklist = await getListById(uuid);
        if (checklist) setLoadedFullItem(checklist);
      } else {
        const note = await getNoteById(uuid);
        if (note) setLoadedFullItem(note);
      }
    } catch (error) {
      console.warn("Failed to load item for preview:", error);
    } finally {
      setIsLoadingItem(false);
    }
  }, [uuid, loadedFullItem, isLoadingItem, metadataItem]);

  useEffect(() => {
    if (showPopup && !loadedFullItem && !isLoadingItem) {
      loadFullItem();
    }
  }, [showPopup, loadedFullItem, isLoadingItem, loadFullItem]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!href) return;

    if (href.startsWith("/jotty/")) {
      const uuidFromPath = href.replace("/jotty/", "");

      if (fullItem?.uuid) {
        router.push(
          itemHref(
            "type" in fullItem && fullItem.type
              ? ItemTypes.CHECKLIST
              : ItemTypes.NOTE,
            fullItem.uuid,
          ),
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
      const isChecklist = fullItem && "type" in fullItem && fullItem.type;
      const targetUuid = fullItem?.uuid || uuid || href.replace("/jotty/", "");

      if (targetUuid) {
        updateAttributes({
          href: itemHref(
            isChecklist ? ItemTypes.CHECKLIST : ItemTypes.NOTE,
            targetUuid,
          ),
          type: isChecklist ? "checklist" : "note",
          category: fullItem?.category || category || "Uncategorized",
          convertToBidirectional: false,
        });
      } else {
        console.warn("Cannot convert jotty to path - missing data");
      }
    } else if (isPathBasedLink) {
      const resolvedUuid =
        uuid ||
        fullItem?.uuid ||
        notes.find((n) => n.id === itemId && (n.category || "") === (category || ""))?.uuid ||
        checklists.find((c) => c.id === itemId && (c.category || "") === (category || ""))?.uuid;

      if (resolvedUuid) {
        updateAttributes({
          href: `/jotty/${resolvedUuid}`,
          uuid: resolvedUuid,
          convertToBidirectional: false,
        });
      } else {
        console.log("Could not find item to convert");
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
      className="inline-flex items-center gap-1.5 mx-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded-jotty hover:bg-primary/15 transition-colors cursor-pointer group relative"
    >
      {showPopup &&
        href &&
        (href.startsWith("/jotty/") ||
          href.startsWith("/note/") ||
          href.startsWith("/checklist/")) && (
          <span className="block absolute top-[110%] left-0 min-w-[300px] max-w-[400px] z-10">
            {isLoadingItem ? (
              <div className="bg-card border border-border rounded-jotty p-4 text-muted-foreground text-sm">
                Loading...
              </div>
            ) : loadedFullItem &&
              "type" in loadedFullItem &&
              loadedFullItem.type ? (
              <ChecklistCard
                list={loadedFullItem as Checklist}
                onSelect={() => {}}
              />
            ) : loadedFullItem ? (
              <NoteCard
                note={loadedFullItem as Note}
                onSelect={() => {}}
                fullScrollableContent
              />
            ) : (
              <div className="bg-card border border-border rounded-jotty p-4 text-muted-foreground text-sm">
                {metadataItem?.title || title}
              </div>
            )}
          </span>
        )}
      <span className="flex-shrink-0">
        {fullItem && "type" in fullItem && fullItem.type ? (
          <>
            {isKanbanType(fullItem.type) ? (
              <TaskDaily01Icon className="h-5 w-5" />
            ) : (
              <CheckmarkSquare04Icon className="h-5 w-5" />
            )}
          </>
        ) : (
          <File02Icon className="h-5 w-5" />
        )}
      </span>
      <span className="text-md lg:text-sm font-medium text-foreground">
        {appSettings?.parseContent === "yes"
          ? title
          : capitalize(title.replace(/-/g, " "))}
      </span>
      ·
      <span className="text-md lg:text-sm font-medium text-foreground bg-primary/30 px-2 py-0.5 rounded-jotty">
        {fullItem?.category ||
          decodeCategoryPath(potentialCategory) ||
          "not-found"}
      </span>
      {isEditable && (isPathBasedLink || canToggle) && (
        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border">
          <span className="text-md lg:text-xs text-muted-foreground">
            {t("editor.linkType")}
          </span>
          <button
            onClick={handleToggleConversion}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-jotty text-sm lg:text-xs font-medium transition-all ${
              isJottyLink
                ? "bg-blue-500/20 text-blue-800 hover:bg-blue-500/30 border border-blue-500/30"
                : convertToBidirectional
                  ? "bg-blue-500/20 text-blue-800 hover:bg-blue-500/30 border border-blue-500/30"
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
                <span>{t("editor.bidirectional")}</span>
              </>
            ) : (
              <>
                <Attachment01Icon className="h-3.5 w-3.5" />
                <span>{t("editor.pathBased")}</span>
              </>
            )}
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
};
