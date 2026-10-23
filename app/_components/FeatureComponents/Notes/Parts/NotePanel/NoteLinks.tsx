"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkSquare04Icon,
  File02Icon,
  Link01Icon,
  TaskDaily01Icon,
} from "@hugeicons/core-free-icons";
import { cn, itemHref } from "@/app/_utils/global-utils";
import { ItemTypes, isKanbanType } from "@/app/_types/enums";
import { RelationsStatus } from "@/app/_consts/relations";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { MENU_DIVIDER_CLASS, MENU_ITEM_CLASS } from "@/app/_consts/styling";
import type { RelatedItem } from "@/app/_types/relations";
import { useRelations } from "@/app/_providers/RelationsProvider";
import { useMentionLink } from "@/app/_hooks/useMentionLink";
import { IndexingRelations } from "@/app/_components/GlobalComponents/Layout/IndexingRelations";
import { PanelEmpty } from "./PanelEmpty";
import { PanelKicker } from "./PanelKicker";

const META_SEPARATOR = "·";

const _iconOf = (item: RelatedItem) => {
  if (item.type === ItemTypes.NOTE) return File02Icon;
  return isKanbanType(item.checklistType) ? TaskDaily01Icon : CheckmarkSquare04Icon;
};

const _folderOf = (category?: string) =>
  category && category !== UNCATEGORIZED ? category.split("/").pop() : null;

export const NoteLinks = () => {
  const router = useRouter();
  const t = useTranslations();
  const { uuid, status, backlinks, mentions } = useRelations();
  const { linking, link } = useMentionLink(uuid);

  if (status === RelationsStatus.BUILDING) return <IndexingRelations compact />;
  if (backlinks.length === 0 && mentions.length === 0) return <PanelEmpty>{t("notePanel.noLinks")}</PanelEmpty>;

  return (
    <div className="flex flex-col gap-0.5">
      {backlinks.length > 0 && (
        <>
          <PanelKicker label={t("notes.referencedBy")} count={backlinks.length} />
          {backlinks.map((item) => {
            const folder = _folderOf(item.category);
            return (
              <button
                type="button"
                key={`${item.type}-${item.uuid}`}
                onClick={() => router.push(itemHref(item.type, item.uuid))}
                className={cn(MENU_ITEM_CLASS, "items-start")}
              >
                <HugeiconsIcon icon={_iconOf(item)} className="mt-0.5 h-4 w-4 flex-none text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.title}</span>
                  <span className="block truncate text-md lg:text-xs text-muted-foreground">
                    {t(`relations.kind.${item.kind}`)}
                    {folder && ` ${META_SEPARATOR} ${folder}`}
                  </span>
                </span>
              </button>
            );
          })}
        </>
      )}

      {backlinks.length > 0 && mentions.length > 0 && <div className={MENU_DIVIDER_CLASS} />}

      {mentions.length > 0 && (
        <>
          <PanelKicker label={t("relations.mentionedIn")} count={mentions.length} />
          <p className="px-2.5 pb-1 text-md lg:text-xs text-muted-foreground">{t("relations.mentionedInHint")}</p>
          {mentions.map((source) => (
            <div key={source.uuid} className="group flex items-start gap-1">
              <button
                type="button"
                onClick={() => router.push(itemHref(ItemTypes.NOTE, source.uuid))}
                className={cn(MENU_ITEM_CLASS, "min-w-0 flex-1 items-start")}
              >
                <HugeiconsIcon icon={File02Icon} className="mt-0.5 h-4 w-4 flex-none text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{source.title}</span>
                  <span className="block text-md lg:text-xs text-muted-foreground line-clamp-2">{source.snippet}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => link(source)}
                disabled={linking !== null}
                title={t("relations.linkMention")}
                aria-label={t("relations.linkMention")}
                className="mt-1 flex-none rounded-[calc(var(--jotty-radius-effective)*0.75)] p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
              >
                <HugeiconsIcon icon={Link01Icon} className="h-4 w-4" />
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
