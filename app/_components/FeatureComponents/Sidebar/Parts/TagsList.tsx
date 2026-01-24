"use client";

import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  GridIcon,
  File02Icon,
  GridOffIcon,
} from "hugeicons-react";
import { cn } from "@/app/_utils/global-utils";
import { Note } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { capitalize } from "lodash";
import { TagInfo, getChildTags, buildTagTree } from "@/app/_utils/tag-utils";
import { useTranslations } from "next-intl";

interface TagsListProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  collapsedTags: Set<string>;
  toggleTag: (tagPath: string) => void;
  onItemClick: (item: Note) => void;
  isItemSelected: (item: Note) => boolean;
}

const TagRenderer = ({
  tag,
  tagsIndex,
  collapsedTags,
  toggleTag,
  onItemClick,
  isItemSelected,
  notes,
  appSettings,
  level = 0,
}: {
  tag: TagInfo;
  tagsIndex: Record<string, TagInfo>;
  collapsedTags: Set<string>;
  toggleTag: (tagPath: string) => void;
  onItemClick: (item: Note) => void;
  isItemSelected: (item: Note) => boolean;
  notes: Partial<Note>[];
  appSettings: any;
  level?: number;
}) => {
  const children = getChildTags(tagsIndex, tag.name);
  const notesForTag = tag.noteUuids
    .map((uuid) => notes.find((n) => n.uuid === uuid))
    .filter((n): n is Partial<Note> => n !== undefined && n.id !== undefined);
  const hasContent = notesForTag.length > 0 || children.length > 0;
  const isCollapsed = collapsedTags.has(tag.name);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <button
          onClick={() => toggleTag(tag.name)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-md lg:text-sm rounded-jotty transition-colors w-full text-left",
            hasContent
              ? "hover:bg-muted/50 cursor-pointer"
              : "text-muted-foreground cursor-default"
          )}
        >
          {hasContent ? (
            isCollapsed ? (
              <>
                <ArrowRight01Icon className="h-5 w-5 lg:h-4 lg:w-4" />
                <GridIcon className="h-5 w-5 lg:h-4 lg:w-4 " />
              </>
            ) : (
              <>
                <ArrowDown01Icon className="h-5 w-5 lg:h-4 lg:w-4" />
                <GridIcon className="h-5 w-5 lg:h-4 lg:w-4 transform -rotate-[20deg]" />
              </>
            )
          ) : (
            <>
              <ArrowRight01Icon className="h-5 w-5 lg:h-4 lg:w-4 opacity-20" />
              <GridOffIcon className="h-5 w-5 lg:h-4 lg:w-4" />
            </>
          )}
          <span className="truncate font-[500]">{tag.displayName}</span>
          <span className="text-md lg:text-xs text-muted-foreground ml-auto">
            {tag.totalCount}
          </span>
        </button>
      </div>

      {!isCollapsed && (
        <div className="ml-2 border-l border-border/30 pl-2">
          {notesForTag.length > 0 && (
            <div className="space-y-1 mb-2">
              {notesForTag.map((note) => {
                if (!note.id || !note.title) return null;
                const noteIsSelected = isItemSelected(note as Note);

                return (
                  <button
                    key={note.uuid || note.id}
                    onClick={() => onItemClick(note as Note)}
                    data-sidebar-item-selected={noteIsSelected}
                    className={cn(
                      "flex items-center gap-2 py-2 px-3 text-md lg:text-sm rounded-jotty transition-colors w-full text-left",
                      noteIsSelected
                        ? "bg-primary/60 text-primary-foreground"
                        : "hover:bg-muted/50 text-foreground"
                    )}
                  >
                    <File02Icon className="h-4 w-4" />
                    <span className="truncate flex-1">
                      {appSettings?.parseContent === "yes"
                        ? note.title
                        : capitalize((note.title || "").replace(/-/g, " "))}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {children.map((childTag) => (
            <TagRenderer
              key={childTag.name}
              tag={childTag}
              tagsIndex={tagsIndex}
              collapsedTags={collapsedTags}
              toggleTag={toggleTag}
              onItemClick={onItemClick}
              isItemSelected={isItemSelected}
              notes={notes}
              appSettings={appSettings}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const TagsList = ({
  collapsed,
  onToggleCollapsed,
  collapsedTags,
  toggleTag,
  onItemClick,
  isItemSelected,
}: TagsListProps) => {
  const t = useTranslations();
  const { tagsIndex, tagsEnabled, notes, appSettings } = useAppMode();

  if (!tagsEnabled) {
    return null;
  }

  const rootTags = buildTagTree(tagsIndex);
  const totalTagCount = Object.keys(tagsIndex).length;

  if (totalTagCount === 0) {
    return null;
  }

  const areAnyTagsCollapsed = rootTags.some((tag) => collapsedTags.has(tag.name));
  const handleToggleAllTags = () => {
    if (areAnyTagsCollapsed) {
      rootTags.forEach((tag) => {
        if (collapsedTags.has(tag.name)) {
          toggleTag(tag.name);
        }
      });
    } else {
      rootTags.forEach((tag) => {
        if (!collapsedTags.has(tag.name)) {
          toggleTag(tag.name);
        }
      });
    }
  };

  return (
    <>
      {rootTags.length > 0 && (
        <div className="space-y-1 overflow-hidden">
          <div className="flex items-center justify-between group">
            <button
              onClick={onToggleCollapsed}
              className="jotty-sidebar-tags-title flex items-center gap-1 text-sm lg:text-xs font-bold uppercase text-muted-foreground tracking-wider hover:text-foreground transition-colors"
            >
              {collapsed ? (
                <ArrowRight01Icon className="h-3 w-3" />
              ) : (
                <ArrowDown01Icon className="h-3 w-3" />
              )}
              {t("notes.tags")}
            </button>
            <button
              onClick={handleToggleAllTags}
              className="jotty-sidebar-tags-toggle-all text-sm lg:text-xs font-medium text-primary hover:underline focus:outline-none"
            >
              {areAnyTagsCollapsed ? t("common.expandAll") : t("common.collapseAll")}
            </button>
          </div>

          {!collapsed && (
            <div>
              {rootTags.map((tag) => (
                <TagRenderer
                  key={tag.name}
                  tag={tag}
                  tagsIndex={tagsIndex}
                  collapsedTags={collapsedTags}
                  toggleTag={toggleTag}
                  onItemClick={onItemClick}
                  isItemSelected={isItemSelected}
                  notes={notes}
                  appSettings={appSettings}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
