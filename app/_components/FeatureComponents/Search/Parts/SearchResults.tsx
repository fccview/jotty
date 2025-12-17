"use client";

import { CheckmarkSquare04Icon, File02Icon, UserMultipleIcon } from "hugeicons-react";
import { cn } from "@/app/_utils/global-utils";
import { ItemType } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";

interface SearchResult {
  id: string;
  title: string;
  type: ItemType;
  content?: string;
  category?: string;
  owner?: string;
  isShared?: boolean;
}

interface SearchResultsProps {
  results: SearchResult[];
  selectedIndex: number;
  onSelectResult: (result: SearchResult) => void;
  query: string;
}

export const SearchResults = ({
  results,
  selectedIndex,
  onSelectResult,
  query,
}: SearchResultsProps) => {
  const getSnippet = (content: string | undefined, query: string) => {
    if (!content) return "";

    const index = content.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return content.slice(0, 100) + "...";

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + 100);
    const snippet = content.slice(start, end);

    return (
      (start > 0 ? "..." : "") + snippet + (end < content.length ? "..." : "")
    );
  };

  if (results.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No results found
      </div>
    );
  }

  return (
    <div className="max-h-[50vh] overflow-y-auto">
      {results.map((result, index) => (
        <button
          key={result.id}
          onClick={() => onSelectResult(result)}
          className={cn(
            "w-full border-b border-border p-4 text-left transition-colors last:border-b-0 hover:bg-accent md:p-3",
            selectedIndex === index && "bg-accent"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              {result.type === ItemTypes.CHECKLIST ? (
                <CheckmarkSquare04Icon className="h-5 w-5 text-primary md:h-4 md:w-4" />
              ) : (
                <File02Icon className="h-5 w-5 text-primary md:h-4 md:w-4" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h4 className="truncate text-base text-foreground md:text-sm md:font-medium">
                  {result.title}
                </h4>
                {result.isShared && (
                  <UserMultipleIcon className="h-4 w-4 flex-shrink-0 text-primary md:h-3 md:w-3" />
                )}
              </div>

              {result.content && (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {getSnippet(result.content, query)}
                </p>
              )}

              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground md:mt-1 md:text-xs">
                <span className="capitalize">{result.type}</span>
                {result.category && (
                  <>
                    <span>•</span>
                    <span>{result.category}</span>
                  </>
                )}
                {result.owner && (
                  <>
                    <span>•</span>
                    <span>by {result.owner}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};