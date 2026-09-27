"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
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
  alias?: string;
  type?: string;
  category?: string;
  uuid?: string;
  itemId?: string;
}

interface InternalLinkComponentProps {
  node: { attrs: InternalLinkAttrs };
  showCategory?: boolean;
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

export const InternalLinkComponent = ({ node, showCategory = true }: InternalLinkComponentProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { href, title, alias, uuid: attrUuid, category } = node.attrs;
  const { appSettings, notes, checklists } = useAppMode();
  const [showPopup, setShowPopup] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
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

  const label = alias || item?.title || title;
  const shownCategory = item?.category || target?.legacy?.category || category;
  const folder = shownCategory?.split("/").filter(Boolean).pop();
  const unreachable = !item && !isLoading;
  const Icon = isChecklist(item)
    ? isKanbanType(item.type)
      ? TaskDaily01Icon
      : CheckmarkSquare04Icon
    : File02Icon;

  return (
    <NodeViewWrapper
      as="span"
      onClick={handleClick}
      onMouseEnter={(event: React.MouseEvent<HTMLElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setAnchor({ top: rect.bottom, left: rect.left });
        setShowPopup(true);
      }}
      onMouseLeave={() => setShowPopup(false)}
      title={unreachable ? t("relations.unreachable") : shownCategory || undefined}
      className={`inline cursor-pointer hover:underline ${unreachable ? "text-muted-foreground" : "text-primary"}`}
    >
      {showPopup && anchor && typeof document !== "undefined" && createPortal(
        <span
          data-link-preview=""
          style={{ top: anchor.top, left: anchor.left }}
          className="block fixed pt-1.5 min-w-[300px] max-w-[400px] z-50"
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
        </span>,
        document.body,
      )}
      <Icon className="inline h-[1em] w-[1em] mr-1 align-[-0.125em]" />
      <span className="font-medium">
        {appSettings?.parseContent === "yes" ? label : capitalize(label.replace(/-/g, " "))}
      </span>
      {showCategory && folder && !unreachable && (
        <span className="ml-1 text-[0.85em] text-muted-foreground">· {folder}</span>
      )}
    </NodeViewWrapper>
  );
};
