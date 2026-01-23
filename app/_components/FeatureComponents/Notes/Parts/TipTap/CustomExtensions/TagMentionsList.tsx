"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useRef,
} from "react";
import { cn } from "@/app/_utils/global-utils";
import { Tag01Icon, Search01Icon } from "hugeicons-react";
import { useTranslations } from "next-intl";

interface TagMentionItem {
  tag: string;
  display: string;
}

interface TagMentionsListProps {
  items: TagMentionItem[];
  command: (item: TagMentionItem) => void;
}

export const TagMentionsList = forwardRef<
  { onKeyDown: (event: KeyboardEvent) => boolean; focusSearch: () => void },
  TagMentionsListProps
>(({ items, command }, ref) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations();

  const filteredItems = items.filter((item) =>
    item.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectItem = (index: number) => {
    const item = filteredItems[index];
    if (item) {
      command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((prev) => Math.max(0, prev - 1));
  };

  const downHandler = () => {
    setSelectedIndex((prev) => Math.min(filteredItems.length - 1, prev + 1));
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

  return (
    <div className="bg-card mt-4 border border-border rounded-jotty shadow-lg p-3 min-w-64 max-w-80">
      <div className="relative mb-3">
        <Search01Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder={t("notes.searchTags")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-3 py-2 text-md lg:text-sm bg-background border border-input rounded-jotty focus:outline-none focus:ring-none focus:ring-ring focus:border-transparent"
        />
      </div>

      <div className="max-h-60 overflow-y-auto">
        {filteredItems.length ? (
          <div className="space-y-1">
            {filteredItems.map((item, index) => (
              <button
                key={item.tag}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2 text-left rounded-jotty text-md lg:text-sm transition-colors",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
                onClick={() => selectItem(index)}
              >
                <Tag01Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium truncate">#{item.display}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-3 py-6 text-center text-md lg:text-sm text-muted-foreground">
            {t("notes.noTagsFound")}
          </div>
        )}
      </div>
    </div>
  );
});

TagMentionsList.displayName = "TagMentionsList";
