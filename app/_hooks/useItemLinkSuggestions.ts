"use client";

import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { itemHref } from "@/app/_utils/global-utils";
import { escapeLinkText } from "@/app/_utils/item-href-utils";
import { ItemTypes } from "@/app/_types/enums";

const LINK_TRIGGER = /(?:^|\s)(@|\[\[)([^\s@[\]]*(?: [^\s@[\]]+)*)$/;
const AT_TRIGGER = "@";
const SUGGESTION_LIMIT = 20;

export interface LinkSuggestion {
  id: string;
  title: string;
  type: ItemTypes;
  category: string;
}

interface LinkQuery {
  start: number;
  query: string;
}

type ListHandle = { onKeyDown: (event: KeyboardEvent) => boolean; focusSearch: () => void };

export const linkQueryOf = (text: string): LinkQuery | null => {
  const match = text.match(LINK_TRIGGER);
  if (!match || match.index === undefined) return null;
  const [whole, trigger, query] = match;
  if (trigger === AT_TRIGGER && query.includes(" ")) return null;
  return { start: match.index + whole.length - trigger.length - query.length, query };
};

export const useItemLinkSuggestions = (
  value: string,
  setValue: (next: string) => void,
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
) => {
  const { notes, checklists, appSettings } = useAppMode();
  const enabled = appSettings?.editor?.enableBilateralLinks !== false;
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const listRef = useRef<ListHandle | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const found = enabled ? linkQueryOf(value) : null;
  const open = Boolean(found) && dismissed !== value;

  const items = useMemo<LinkSuggestion[]>(() => {
    if (!found) return [];
    const needle = found.query.toLowerCase();
    return [
      ...notes.map((note) => ({ ...note, type: ItemTypes.NOTE })),
      ...checklists.map((list) => ({ ...list, type: ItemTypes.CHECKLIST })),
    ]
      .filter((item) => item.uuid && (item.title || "").toLowerCase().includes(needle))
      .slice(0, SUGGESTION_LIMIT)
      .map((item) => ({
        id: item.uuid!,
        title: item.title || "",
        type: item.type,
        category: item.category || "",
      }));
  }, [found?.query, notes, checklists]);

  useEffect(() => {
    if (!open || !inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 4, left: rect.left });
  }, [open, inputRef]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target) || inputRef.current?.contains(target)) return;
      setDismissed(value);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, value, inputRef]);

  const pick = (item: LinkSuggestion) => {
    if (!found) return;
    const link = `[${escapeLinkText(item.title)}](${itemHref(item.type, item.id)}) `;
    setValue(`${value.slice(0, found.start)}${link}`);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent): boolean => {
    if (!open || items.length === 0 || !listRef.current) return false;
    if (event.key === "Escape") {
      setDismissed(value);
      event.preventDefault();
      return true;
    }
    const handled = listRef.current.onKeyDown(event.nativeEvent);
    if (handled) event.preventDefault();
    return handled;
  };

  return {
    open: open && items.length > 0,
    items,
    position,
    pick,
    handleKeyDown,
    listRef,
    wrapperRef,
  };
};

export type ItemLinkSuggestions = ReturnType<typeof useItemLinkSuggestions>;
