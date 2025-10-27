"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { cn } from "@/app/_utils/global-utils";
import { useTranslations } from "next-intl";

interface SearchInputProps {
  query: string;
  onQueryChange: (query: string) => void;
  onClear: () => void;
  onFocus: () => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export const SearchInput = ({
  query,
  onQueryChange,
  onClear,
  onFocus,
  placeholder,
  className,
  inputRef,
}: SearchInputProps) => {
  const t = useTranslations();
  const defaultPlaceholder = placeholder || t("global.search_placeholder");

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={onFocus}
        placeholder={defaultPlaceholder}
        className="w-full rounded-lg border border-input bg-background py-3 pl-12 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 md:rounded-md md:py-2 md:pl-10 md:pr-10 md:text-sm"
      />
      {query && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 p-0 text-muted-foreground hover:text-foreground md:right-1 md:h-6 md:w-6"
        >
          <X className="h-4 w-4 md:h-3 md:w-3" />
        </Button>
      )}
    </div>
  );
};