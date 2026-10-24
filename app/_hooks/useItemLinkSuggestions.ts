"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { itemHref } from "@/app/_utils/global-utils";
import { escapeLinkText } from "@/app/_utils/item-href-utils";
import { ItemTypes } from "@/app/_types/enums";
import { fetchItems } from "@/app/_utils/ui-lookups";

const LINK_TRIGGER = /(?:^|\s)(@|\[\[)([^\s@[\]]*(?: [^\s@[\]]+)*)$/;
const AT_TRIGGER = "@";
const SUGGESTION_LIMIT = 20;
const SUGGESTION_DEBOUNCE_MS = 120;

const _suggestion = (
  item: { uuid?: string; title?: string; category?: string },
  type: ItemTypes,
): LinkSuggestion => ({
  id: item.uuid!,
  title: item.title || "",
  type,
  category: item.category || "",
});

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
  const { appSettings } = useAppMode();
  const enabled = appSettings?.editor?.enableBilateralLinks !== false;
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const listRef = useRef<ListHandle | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const found = enabled ? linkQueryOf(value) : null;
  const open = Boolean(found) && dismissed !== value;

  const query = found?.query;
  const [items, setItems] = useState<LinkSuggestion[]>([]);

  useEffect(() => {
    if (query === undefined) {
      setItems([]);
      return;
    }
    let live = true;
    const timer = setTimeout(() => {
      fetchItems(query, SUGGESTION_LIMIT, false)
        .then((result) => {
          if (!live) return;
          if (!result.success || !result.data) {
            console.error("Could not find items to link:", result.error);
            return;
          }
          setItems([
            ...result.data.notes.map((note) => _suggestion(note, ItemTypes.NOTE)),
            ...result.data.checklists.map((list) => _suggestion(list, ItemTypes.CHECKLIST)),
          ]);
        })
        .catch((error) => console.error("Could not find items to link:", error));
    }, SUGGESTION_DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query]);

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
