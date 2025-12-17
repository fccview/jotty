"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useRef,
} from "react";
import { cn } from "@/app/_utils/global-utils";
import {
  File02Icon,
  CheckmarkSquare04Icon,
  Search01Icon,
} from "hugeicons-react";
import { ItemType } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";

interface AtMentionItem {
  title: string;
  type: ItemType;
  category: string;
  id: string;
}

interface AtMentionsListProps {
  items: AtMentionItem[];
  command: (item: AtMentionItem) => void;
}

export const AtMentionsList = forwardRef<
  { onKeyDown: (event: KeyboardEvent) => boolean; focusSearch: () => void },
  AtMentionsListProps
>(({ items, command }, ref) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const notes = filteredItems.filter((item) => item.type === ItemTypes.NOTE);
  const checklists = filteredItems.filter(
    (item) => item.type === ItemTypes.CHECKLIST
  );
  const allItems = [...notes, ...checklists];

  const selectItem = (index: number) => {
    const item = allItems[index];
    if (item) {
      command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((prev) => Math.max(0, prev - 1));
  };

  const downHandler = () => {
    setSelectedIndex((prev) => Math.min(allItems.length - 1, prev + 1));
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  const focusSearch = () => {
    searchInputRef.current?.focus();
  };

  useEffect(() => setSelectedIndex(0), [searchQuery]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        focusSearch();
        event.preventDefault();
        return true;
      }

      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    },
    focusSearch,
  }));

  const renderSection = (
    title: string,
    items: AtMentionItem[],
    icon: React.ReactNode,
    startIndex: number
  ) => (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {icon}
        {title}
      </div>
      <div className="space-y-1">
        {items.map((item, index) => {
          const globalIndex = startIndex + index;
          return (
            <button
              key={`${item.type}-${item.id}`}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 text-left rounded-md text-sm transition-colors",
                globalIndex === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
              onClick={() => selectItem(globalIndex)}
            >
              <div className="flex-shrink-0 text-muted-foreground">
                {item.type === ItemTypes.NOTE ? (
                  <File02Icon className="h-4 w-4" />
                ) : (
                  <CheckmarkSquare04Icon className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {item.category || "Uncategorized"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-80 max-w-96">
      <div className="relative mb-3">
        <Search01Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search notes and checklists..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
      </div>

      <div className="max-h-80 overflow-y-auto">
        {allItems.length ? (
          <>
            {notes.length > 0 &&
              renderSection(
                "Notes",
                notes,
                <File02Icon className="h-3 w-3" />,
                0
              )}
            {checklists.length > 0 &&
              renderSection(
                "Checklists",
                checklists,
                <CheckmarkSquare04Icon className="h-3 w-3" />,
                notes.length
              )}
          </>
        ) : (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No results found
          </div>
        )}
      </div>
    </div>
  );
});

AtMentionsList.displayName = "AtMentionsList";
