"use client";

import { cn } from "@/app/_utils/global-utils";
import { Checklist, Note, AppMode } from "@/app/_types";
import { SearchInput } from "./Parts/SearchInput";
import { SearchResults } from "./Parts/SearchResults";
import { useSearch } from "@/app/_hooks/useSearch";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

interface SearchBarProps {
  mode: AppMode;
  onModeChange?: (mode: AppMode) => void;
  className?: string;
  autoFocus?: boolean;
  onResultSelect?: () => void;
}

export const SearchBar = ({
  mode,
  onModeChange,
  className,
  autoFocus = false,
  onResultSelect,
}: SearchBarProps) => {
  const t = useTranslations();
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
  } = useSearch({ mode, onModeChange, onResultSelect });

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus, inputRef]);

  const translatedMode = mode === "notes" ? t('notes.title') : t('checklists.title')

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
        placeholder={t('common.searchPlaceholder')}
        inputRef={inputRef}
        className={cn("transition-all")}
      />

      {isOpen && query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-jotty shadow-lg z-50 overflow-hidden">
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
