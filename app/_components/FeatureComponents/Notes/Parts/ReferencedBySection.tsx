"use client";

import {
  File02Icon,
  CheckmarkSquare04Icon,
  TaskDaily01Icon,
} from "hugeicons-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { itemHref } from "@/app/_utils/global-utils";
import { ItemTypes, isKanbanType } from "@/app/_types/enums";
import { RelationsStatus } from "@/app/_consts/relations";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import type { RelatedItem } from "@/app/_types/relations";
import { useRelations } from "@/app/_providers/RelationsProvider";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { IndexingRelations } from "@/app/_components/GlobalComponents/Layout/IndexingRelations";
import { MentionedInSection } from "./MentionedInSection";

const META_SEPARATOR = "·";

const ItemIcon = ({ item }: { item: RelatedItem }) => {
  if (item.type === ItemTypes.NOTE) return <File02Icon className="h-4 w-4" />;
  if (isKanbanType(item.checklistType))
    return <TaskDaily01Icon className="h-4 w-4" />;
  return <CheckmarkSquare04Icon className="h-4 w-4" />;
};

export const ReferencedBySection = ({
  className = "",
}: {
  className?: string;
}) => {
  const router = useRouter();
  const t = useTranslations();
  const { appSettings } = useAppMode();
  const { status, backlinks, mentions } = useRelations();

  if (appSettings?.editor?.enableBilateralLinks === false) return null;
  if (status === RelationsStatus.BUILDING) {
    return (
      <div className={className}>
        <IndexingRelations compact />
      </div>
    );
  }
  if (backlinks.length === 0 && mentions.length === 0) return null;

  return (
    <div className={className}>
      {backlinks.length > 0 && (
        <section className="jotty-backlinks mt-8">
          <h3 className="jotty-backlinks-title">
            <span>{t("notes.referencedBy")}</span>
            <span className="jotty-backlinks-count">{backlinks.length}</span>
          </h3>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-2">
            {backlinks.map((item) => {
              const category =
                item.category && item.category !== UNCATEGORIZED
                  ? item.category.split("/").pop()
                  : null;
              return (
                <button
                  type="button"
                  key={`${item.type}-${item.uuid}`}
                  onClick={() => router.push(itemHref(item.type, item.uuid))}
                  className="jotty-backlink rounded-jotty"
                >
                  <span className="jotty-backlink-icon rounded-jotty">
                    <ItemIcon item={item} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="jotty-backlink-title">{item.title}</span>
                    <span className="jotty-backlink-meta">
                      {t(`relations.kind.${item.kind}`)}
                      {category && ` ${META_SEPARATOR} ${category}`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
      <MentionedInSection />
    </div>
  );
};
