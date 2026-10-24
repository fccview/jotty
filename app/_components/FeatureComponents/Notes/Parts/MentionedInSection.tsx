"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link04Icon } from "hugeicons-react";
import { itemHref } from "@/app/_utils/global-utils";
import { ItemTypes } from "@/app/_types/enums";
import { useRelations } from "@/app/_providers/RelationsProvider";
import { useMentionLink } from "@/app/_hooks/useMentionLink";

export const MentionedInSection = () => {
  const router = useRouter();
  const t = useTranslations();
  const { uuid: targetUuid, mentions } = useRelations();
  const { linking, link } = useMentionLink(targetUuid);

  if (!targetUuid || mentions.length === 0) return null;

  return (
    <div className="mt-8 space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <span>{t("relations.mentionedIn")}</span>
        <span className="text-md lg:text-sm text-muted-foreground font-normal">
          ({mentions.length})
        </span>
      </h3>
      <p className="text-md lg:text-sm text-muted-foreground">{t("relations.mentionedInHint")}</p>

      <div className="space-y-2">
        {mentions.map((source) => (
          <div
            key={source.uuid}
            className="flex items-start gap-3 bg-muted/50 border border-border rounded-jotty p-3"
          >
            <button
              type="button"
              onClick={() => router.push(itemHref(ItemTypes.NOTE, source.uuid))}
              className="flex-1 min-w-0 text-left group"
            >
              <span className="block text-md lg:text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {source.title}
              </span>
              <span className="block text-md lg:text-xs text-muted-foreground truncate">
                {source.snippet}
              </span>
            </button>
            <button
              type="button"
              onClick={() => link(source)}
              disabled={linking !== null}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-1 text-md lg:text-xs border border-border rounded-jotty text-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
              <Link04Icon className="h-3.5 w-3.5" />
              {t("relations.linkMention")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
