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

const ItemIcon = ({ item }: { item: RelatedItem }) => {
  if (item.type === ItemTypes.NOTE)
    return <File02Icon className="h-4 w-4 text-blue-500" />;
  if (isKanbanType(item.checklistType))
    return <TaskDaily01Icon className="h-4 w-4 text-green-500" />;
  return <CheckmarkSquare04Icon className="h-4 w-4 text-green-500" />;
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
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span>{t("notes.referencedBy")}</span>
            <span className="text-md lg:text-sm text-muted-foreground font-normal">
              ({backlinks.length})
            </span>
          </h3>

          <div className="space-y-2">
            {backlinks.map((item) => (
              <button
                type="button"
                key={`${item.type}-${item.uuid}`}
                onClick={() => router.push(itemHref(item.type, item.uuid))}
                className="w-full text-left bg-muted/50 border border-border rounded-jotty p-3 cursor-pointer hover:shadow-sm hover:border-primary/30 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <ItemIcon item={item} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-md lg:text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-md lg:text-xs text-muted-foreground">
                      {t(`relations.kind.${item.kind}`)}
                    </span>
                    {item.category && item.category !== UNCATEGORIZED && (
                      <>
                        <span className="text-md lg:text-xs text-muted-foreground">
                          •
                        </span>
                        <span className="text-md lg:text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {item.category.split("/").pop()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      <MentionedInSection />
    </div>
  );
};
