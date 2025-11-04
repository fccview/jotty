import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppMode, Checklist, ItemType, Note } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { capitalize } from "lodash";
import { ItemTypes } from "@/app/_types/enums";

interface useSearchProps {
  mode: AppMode;
  onModeChange?: (mode: AppMode) => void;
  onResultSelect?: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  type: ItemType;
  content?: string;
}

export const useSearch = ({
  mode,
  onModeChange,
  onResultSelect,
}: useSearchProps) => {
  const router = useRouter();
  const { checklists, notes, appSettings } = useAppMode();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      const targetPath = `/${result.type}/${result.id}`;
      const targetMode = `${result.type}s` as AppMode;

      if (mode !== targetMode && onModeChange) {
        onModeChange(targetMode);
      }

      router.push(targetPath);
      setIsOpen(false);
      setQuery("");

      onResultSelect?.();
    },
    [mode, onModeChange, router, onResultSelect]
  );

  const processedItems = useMemo(
    () => [
      ...checklists.map((c) => ({
        id: c.id || "",
        title: appSettings?.parseContent === "yes" ? c.title : capitalize(c.title?.replace(/-/g, " ")),
        type: ItemTypes.CHECKLIST,
        content: c?.items?.map((i) => i.text).join(" ") || "".toLowerCase(),
      })),
      ...notes.map((n) => ({
        id: n.id || "",
        title: appSettings?.parseContent === "yes" ? n.title : capitalize(n.title?.replace(/-/g, " ")),
        type: ItemTypes.NOTE,
        content: n.content?.toLowerCase() || "",
      })),
    ],
    [checklists, notes]
  );

  useEffect(() => {
    const performSearch = (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }
      const lowerCaseQuery = searchQuery.toLowerCase();

      const searchResults = processedItems
        .filter(
          (item) =>
            item.title?.toLowerCase().includes(lowerCaseQuery) ||
            item.content.includes(lowerCaseQuery)
        )
        .slice(0, 8);

      setResults(searchResults as SearchResult[]);
      setSelectedIndex(0);
    };

    const debounceTimeout = setTimeout(() => performSearch(query), 100);
    return () => clearTimeout(debounceTimeout);
  }, [query, processedItems]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          setIsOpen(false);
          setQuery("");
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % results.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(
            (prev) => (prev - 1 + results.length) % results.length
          );
          break;
        case "Enter":
          if (results[selectedIndex]) {
            e.preventDefault();
            handleSelectResult(results[selectedIndex]);
          }
          break;
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, results, selectedIndex, handleSelectResult]);

  return {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    results,
    selectedIndex,
    handleSelectResult,
    inputRef,
    containerRef,
  };
};
