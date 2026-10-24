"use client";

import { Fragment } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { SourceCodeIcon } from "@hugeicons/core-free-icons";
import { MENU_DIVIDER_CLASS, MENU_ITEM_CLASS } from "@/app/_consts/styling";
import { TagSource, tagHref } from "@/app/_utils/tag-utils";
import { PanelEmpty } from "./PanelEmpty";
import { PanelKicker } from "./PanelKicker";

interface NoteTagsProps {
  sources: TagSource[];
  onEditFrontmatter?: () => void;
}

enum TagGroups {
  ADDING = "adding",
  REMOVING = "removing",
  FRONTMATTER = "frontmatter",
  TEXT = "text",
}

const GROUP_ORDER = [TagGroups.ADDING, TagGroups.REMOVING, TagGroups.FRONTMATTER, TagGroups.TEXT];

const _groupOf = ({ inText, inFrontmatter, leaving }: TagSource): TagGroups => {
  if (inText && !inFrontmatter) return TagGroups.ADDING;
  if (leaving) return TagGroups.REMOVING;
  if (!inText) return TagGroups.FRONTMATTER;
  return TagGroups.TEXT;
};

export const NoteTags = ({ sources, onEditFrontmatter }: NoteTagsProps) => {
  const t = useTranslations();
  const groups = GROUP_ORDER.map((group) => ({
    group,
    tags: sources.filter((source) => _groupOf(source) === group),
  })).filter(({ tags }) => tags.length > 0);

  return (
    <div className="flex flex-col gap-0.5">
      {onEditFrontmatter && (
        <>
          <button type="button" onClick={onEditFrontmatter} className={MENU_ITEM_CLASS}>
            <HugeiconsIcon icon={SourceCodeIcon} className="h-4 w-4 text-muted-foreground" />
            {t("frontmatter.edit")}
          </button>
          <div className={MENU_DIVIDER_CLASS} />
        </>
      )}
      {sources.length === 0 && <PanelEmpty>{t("notePanel.noTags")}</PanelEmpty>}
      {groups.map(({ group, tags }, index) => (
        <Fragment key={group}>
          {index > 0 && <div className={MENU_DIVIDER_CLASS} />}
          <PanelKicker label={t(`notePanel.tagGroups.${group}`)} count={tags.length} />
          {tags.map((source) => (
            <Link key={source.tag} href={tagHref(source.tag)} title={source.tag} className={MENU_ITEM_CLASS}>
              <span className="min-w-0 flex-1 truncate font-medium text-primary">
                <span className="opacity-60">#</span>
                {source.tag}
              </span>
            </Link>
          ))}
        </Fragment>
      ))}
    </div>
  );
};
