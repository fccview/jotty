import { useCallback, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppMode, ItemType } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { capitalize } from "lodash";
import { ItemTypes } from "@/app/_types/enums";
import { encodeCategoryPath, encodeId } from "@/app/_utils/global-utils";
import { search } from "@/app/_server/actions/search";

interface useSearchProps {
  mode: AppMode;
  onModeChange?: (mode: AppMode) => void;
  onResultSelect?: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  type: ItemType;
  category?: string;
}

export const useSearch = ({
  mode,
  onModeChange,
  onResultSelect,
}: useSearchProps) => {
  const router = useRouter();
  const { appSettings } = useAppMode();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      const targetPath = `/${result.type}/${encodeCategoryPath(
        result.category || "Uncategorized"
      )}/${encodeId(result.id)}`;
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

  useEffect(() => {
    const performSearch = async (searchQuery: string) => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const result = await search(searchQuery);
        if (result.success && result.data) {
          const formatted = result.data.map((item) => ({
            id: item.id,
            title:
              appSettings?.parseContent === "yes"
                ? item.title
                : capitalize(item.title?.replace(/-/g, " ")),
            type: item.type === "note" ? ItemTypes.NOTE : ItemTypes.CHECKLIST,
            category: item.category || "Uncategorized",
          }));
          setResults(formatted as SearchResult[]);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimeout = setTimeout(() => performSearch(query), 300);
    return () => clearTimeout(debounceTimeout);
  }, [query, appSettings]);

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
    isSearching,
  };
};
