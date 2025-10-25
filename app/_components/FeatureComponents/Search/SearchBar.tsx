"use client";

import { cn } from "@/app/_utils/global-utils";
import { Checklist, Note, AppMode } from "@/app/_types";
import { SearchInput } from "./Parts/SearchInput";
import { SearchResults } from "./Parts/SearchResults";
import { useSearch } from "@/app/_hooks/useSearch";
import { useEffect } from "react";

interface SearchBarProps {
  mode: AppMode;
  checklists: Checklist[];
  notes: Note[];
  onModeChange?: (mode: AppMode) => void;
  className?: string;
  autoFocus?: boolean;
  onResultSelect?: () => void;
}

export const SearchBar = ({
  mode,
  checklists,
  notes,
  onModeChange,
  className,
  autoFocus = false,
  onResultSelect,
}: SearchBarProps) => {
  const {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    results,
    selectedIndex,
    handleSelectResult,
    inputRef,
    containerRef,
  } = useSearch({ mode, checklists, notes, onModeChange, onResultSelect });

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus, inputRef]);

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <SearchInput
        query={query}
        onQueryChange={setQuery}
        onClear={() => setQuery("")}
        onFocus={() => setIsOpen(true)}
        placeholder={`Search ${mode}... (⌘K)`}
        inputRef={inputRef}
        className={cn("transition-all", isOpen && "border-primary shadow-md")}
      />

      {isOpen && query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-md shadow-lg z-50 overflow-hidden">
          <SearchResults
            results={results}
            selectedIndex={selectedIndex}
            onSelectResult={handleSelectResult}
            query={query}
          />
        </div>
      )}
    </div>
  );
};
