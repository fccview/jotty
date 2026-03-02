"use client";

import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  GridIcon,
  GridOffIcon,
} from "hugeicons-react";
import { cn } from "@/app/_utils/global-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { TagInfo, getChildTags, buildTagTree } from "@/app/_utils/tag-utils";
import { useTranslations } from "next-intl";

interface TagsListProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  collapsedTags: Set<string>;
  toggleTag: (tagPath: string) => void;
  onTagSelect: (tagName: string) => void;
  onClose?: () => void;
}

const TagRenderer = ({
  tag,
  tagsIndex,
  collapsedTags,
  toggleTag,
  onTagSelect,
  onClose,
  level = 0,
}: {
  tag: TagInfo;
  tagsIndex: Record<string, TagInfo>;
  collapsedTags: Set<string>;
  toggleTag: (tagPath: string) => void;
  onTagSelect: (tagName: string) => void;
  onClose?: () => void;
  level?: number;
}) => {
  const children = getChildTags(tagsIndex, tag.name);
  const hasContent =
    tag.noteUuids.length > 0 ||
    tag.checklistUuids.length > 0 ||
    children.length > 0;
  const isCollapsed = collapsedTags.has(tag.name);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-md lg:text-sm rounded-jotty transition-colors w-full text-left",
            hasContent ? "hover:bg-muted/50" : "text-muted-foreground",
          )}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasContent) toggleTag(tag.name);
            }}
            className={cn(
              "flex items-center shrink-0",
              hasContent ? "cursor-pointer" : "cursor-default",
            )}
          >
            {hasContent ? (
              isCollapsed ? (
                <ArrowRight01Icon className="h-5 w-5 lg:h-4 lg:w-4" />
              ) : (
                <ArrowDown01Icon className="h-5 w-5 lg:h-4 lg:w-4" />
              )
            ) : (
              <ArrowRight01Icon className="h-5 w-5 lg:h-4 lg:w-4 opacity-20" />
            )}
          </button>
          <button
            onClick={() => onTagSelect(tag.name)}
            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
          >
            {hasContent ? (
              isCollapsed ? (
                <GridIcon className="h-5 w-5 lg:h-4 lg:w-4 shrink-0" />
              ) : (
                <GridIcon className="h-5 w-5 lg:h-4 lg:w-4 shrink-0 transform -rotate-[20deg]" />
              )
            ) : (
              <GridOffIcon className="h-5 w-5 lg:h-4 lg:w-4 shrink-0" />
            )}
            <span className="truncate font-[500]">{tag.displayName}</span>
            <span className="text-md lg:text-xs text-muted-foreground ml-auto">
              {tag.totalCount}
            </span>
          </button>
        </div>
      </div>

      {!isCollapsed && children.length > 0 && (
        <div className="ml-2 border-l border-border/30 pl-2">
          {children.map((childTag) => (
            <TagRenderer
              key={childTag.name}
              tag={childTag}
              tagsIndex={tagsIndex}
              collapsedTags={collapsedTags}
              toggleTag={toggleTag}
              onTagSelect={onTagSelect}
              onClose={onClose}
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
  onTagSelect,
  onClose,
}: TagsListProps) => {
  const t = useTranslations();
  const { tagsIndex, tagsEnabled } = useAppMode();

  if (!tagsEnabled) {
    return null;
  }

  const rootTags = buildTagTree(tagsIndex);
  const totalTagCount = Object.keys(tagsIndex).length;

  if (totalTagCount === 0) {
    return null;
  }

  const areAnyTagsCollapsed = rootTags.some((tag) =>
    collapsedTags.has(tag.name),
  );
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
              {areAnyTagsCollapsed
                ? t("common.expandAll")
                : t("common.collapseAll")}
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
                  onTagSelect={onTagSelect}
                  onClose={onClose}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
