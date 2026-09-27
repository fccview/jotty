"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { File02Icon, CheckmarkSquare04Icon, TaskDaily01Icon } from "hugeicons-react";
import { useRouter } from "next/navigation";
import { capitalize } from "lodash";
import { useTranslations } from "next-intl";
import { getNoteById } from "@/app/_server/actions/note";
import { getListById } from "@/app/_server/actions/checklist";
import { itemHref } from "@/app/_utils/global-utils";
import { parseItemHref } from "@/app/_utils/item-href-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { NoteCard } from "@/app/_components/GlobalComponents/Cards/NoteCard";
import { ChecklistCard } from "@/app/_components/GlobalComponents/Cards/ChecklistCard";
import { Checklist, Note } from "@/app/_types";
import { isKanbanType, ItemTypes } from "@/app/_types/enums";

interface InternalLinkAttrs {
  href: string;
  title: string;
  type?: string;
  category?: string;
  uuid?: string;
  itemId?: string;
}

interface InternalLinkComponentProps {
  node: { attrs: InternalLinkAttrs };
}

type LinkedItem = Partial<Note> | Partial<Checklist>;

const isChecklist = (item?: LinkedItem | null): item is Partial<Checklist> =>
  Boolean(item && "type" in item && item.type);

const _fetchItem = async (uuid: string, type?: ItemTypes): Promise<Note | Checklist | null> => {
  if (type !== ItemTypes.CHECKLIST) {
    const note = await getNoteById(uuid);
    if (note) return note;
  }
  if (type !== ItemTypes.NOTE) {
    const list = await getListById(uuid);
    if (list) return list;
  }
  return null;
};

export const InternalLinkComponent = ({ node }: InternalLinkComponentProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { href, title, uuid: attrUuid, category } = node.attrs;
  const { appSettings, notes, checklists } = useAppMode();
  const [showPopup, setShowPopup] = useState(false);
  const [loadedItem, setLoadedItem] = useState<Note | Checklist | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const target = useMemo(() => parseItemHref(href), [href]);
  const uuid = (target?.uuid || attrUuid || "").toLowerCase();

  const knownItem: LinkedItem | undefined = useMemo(
    () =>
      notes.find((note) => note.uuid?.toLowerCase() === uuid) ||
      checklists.find((list) => list.uuid?.toLowerCase() === uuid),
    [notes, checklists, uuid],
  );

  const item: LinkedItem | undefined = loadedItem || knownItem;
  const type = item
    ? isChecklist(item)
      ? ItemTypes.CHECKLIST
      : ItemTypes.NOTE
    : target?.type;

  const loadItem = useCallback(async () => {
    if (loadedItem || isLoading || !uuid) return;
    setIsLoading(true);
    try {
      setLoadedItem(await _fetchItem(uuid, type));
    } catch (error) {
      console.warn("Failed to load linked item:", error);
    } finally {
      setIsLoading(false);
    }
  }, [loadedItem, isLoading, uuid, type]);

  useEffect(() => {
    if (showPopup) loadItem();
  }, [showPopup, loadItem]);

  const handleClick = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (!href) return;

    if (uuid && type) {
      router.push(itemHref(type, uuid));
      return;
    }

    if (uuid) {
      const found = await _fetchItem(uuid).catch((error) => {
        console.warn("Failed to resolve linked item:", error);
        return null;
      });
      if (found?.uuid) {
        router.push(itemHref(isChecklist(found) ? ItemTypes.CHECKLIST : ItemTypes.NOTE, found.uuid));
      }
      return;
    }

    router.push(href);
  };

  const label = item?.title || title;
  const shownCategory = item?.category || target?.legacy?.category || category;

  return (
    <NodeViewWrapper
      as="span"
      onClick={handleClick}
      onMouseEnter={() => setShowPopup(true)}
      onMouseLeave={() => setShowPopup(false)}
      className="inline-flex items-center gap-1.5 mx-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded-jotty hover:bg-primary/15 transition-colors cursor-pointer group relative"
    >
      {showPopup && (
        <span
          data-link-preview=""
          className="block absolute top-[110%] left-0 min-w-[300px] max-w-[400px] z-10"
        >
          {isLoading ? (
            <span className="block bg-card border border-border rounded-jotty p-4 text-muted-foreground text-sm">
              {t("common.loading")}
            </span>
          ) : loadedItem && isChecklist(loadedItem) ? (
            <ChecklistCard list={loadedItem as Checklist} onSelect={() => {}} />
          ) : loadedItem ? (
            <NoteCard note={loadedItem as Note} onSelect={() => {}} fullScrollableContent />
          ) : (
            <span className="block bg-card border border-border rounded-jotty p-4 text-muted-foreground text-sm">
              {label}
            </span>
          )}
        </span>
      )}
      <span className="flex-shrink-0">
        {isChecklist(item) ? (
          isKanbanType(item.type) ? (
            <TaskDaily01Icon className="h-5 w-5" />
          ) : (
            <CheckmarkSquare04Icon className="h-5 w-5" />
          )
        ) : (
          <File02Icon className="h-5 w-5" />
        )}
      </span>
      <span className="text-md lg:text-sm font-medium text-foreground">
        {appSettings?.parseContent === "yes" ? label : capitalize(label.replace(/-/g, " "))}
      </span>
      {shownCategory && (
        <>
          ·
          <span className="text-md lg:text-sm font-medium text-foreground bg-primary/30 px-2 py-0.5 rounded-jotty">
            {shownCategory}
          </span>
        </>
      )}
      {!item && !isLoading && (
        <span className="text-md lg:text-xs text-muted-foreground">
          {t("relations.unreachable")}
        </span>
      )}
    </NodeViewWrapper>
  );
};
