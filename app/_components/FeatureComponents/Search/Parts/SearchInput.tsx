"use client";

import { Search01Icon, MultiplicationSignIcon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { cn } from "@/app/_utils/global-utils";

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
  placeholder = "Search checklists and notes...",
  className,
  inputRef,
}: SearchInputProps) => {
  return (
    <div className={cn("relative", className)}>
      <Search01Icon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4 z-10" />
      <Input
        ref={inputRef}
        id="search"
        name="search"
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        className="!space-y-0 [&>label]:hidden pl-12 pr-12 md:pl-10 md:pr-10 py-3 md:py-2 text-base md:text-sm"
      />
      {query && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 p-0 text-muted-foreground hover:text-foreground md:right-1 md:h-6 md:w-6 z-10"
        >
          <MultiplicationSignIcon className="h-4 w-4 md:h-3 md:w-3" />
        </Button>
      )}
    </div>
  );
};
