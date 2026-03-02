"use client";

import { useState, useRef, useEffect, useMemo, RefObject } from "react";

function getHashtagQuery(text: string): string | null {
  const full = text.match(/#([a-zA-Z][a-zA-Z0-9_/-]*)$/);
  if (full) return full[1];
  const bare = text.match(/#$/);
  return bare ? "" : null;
}

export interface UseTagSuggestionsOptions {
  tagsIndex: Record<string, { displayName?: string }>;
  tagsEnabled: boolean;
}

export interface UseTagSuggestionsReturn {
  showTagSuggestions: boolean;
  setShowTagSuggestions: (show: boolean) => void;
  tagItems: { tag: string; display: string }[];
  tagPopupPos: { top: number; left: number };
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTagCommand: (item: { tag: string; display: string }) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  tagMentionsRef: RefObject<{
    onKeyDown: (event: KeyboardEvent) => boolean;
    focusSearch: () => void;
  } | null>;
  tagSuggestionsWrapperRef: RefObject<HTMLDivElement | null>;
}

export function useTagSuggestions(
  value: string,
  setValue: (v: string) => void,
  inputRef: RefObject<HTMLInputElement | null>,
  options: UseTagSuggestionsOptions,
): UseTagSuggestionsReturn {
  const { tagsIndex, tagsEnabled } = options;
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagPopupPos, setTagPopupPos] = useState({ top: 0, left: 0 });
  const tagMentionsRef = useRef<{
    onKeyDown: (event: KeyboardEvent) => boolean;
    focusSearch: () => void;
  } | null>(null);
  const tagSuggestionsWrapperRef = useRef<HTMLDivElement | null>(null);

  const tagItems = useMemo(() => {
    if (!tagsEnabled) return [];
    const query = getHashtagQuery(value);
    if (query === null) return [];
    const lowerQuery = query.toLowerCase();
    const allTags = Object.keys(tagsIndex);
    const filtered = allTags
      .filter((k) => k.includes(lowerQuery))
      .slice(0, 9)
      .map((k) => ({ tag: k, display: k }));
    if (lowerQuery && !allTags.some((t) => t.toLowerCase() === lowerQuery)) {
      filtered.unshift({ tag: lowerQuery, display: lowerQuery });
    }
    return filtered;
  }, [value, tagsIndex, tagsEnabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (tagsEnabled) {
      const query = getHashtagQuery(newValue);
      if (query !== null) {
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          setTagPopupPos({ top: rect.bottom + 4, left: rect.left });
        }
        setShowTagSuggestions(true);
        return;
      }
      setShowTagSuggestions(false);
    }
  };

  const handleTagCommand = (item: { tag: string; display: string }) => {
    const query = getHashtagQuery(value);
    if (query !== null) {
      const prefix = value.slice(0, value.length - (query.length + 1));
      setValue(`${prefix}#${item.tag} `);
    }
    setShowTagSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showTagSuggestions || !tagMentionsRef.current) return;
    if (e.key === "Escape") {
      setShowTagSuggestions(false);
      e.preventDefault();
      return;
    }
    const handled = tagMentionsRef.current.onKeyDown(e.nativeEvent);
    if (handled) e.preventDefault();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tagSuggestionsWrapperRef.current &&
        !tagSuggestionsWrapperRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowTagSuggestions(false);
      }
    };

    if (showTagSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showTagSuggestions, inputRef]);

  return {
    showTagSuggestions,
    setShowTagSuggestions,
    tagItems,
    tagPopupPos,
    handleChange,
    handleTagCommand,
    handleKeyDown,
    tagMentionsRef,
    tagSuggestionsWrapperRef,
  };
}
