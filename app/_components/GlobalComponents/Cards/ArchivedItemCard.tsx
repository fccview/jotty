"use client";

import {
  Clock01Icon,
  Archive02Icon,
  File02Icon,
  CheckmarkSquare04Icon,
} from "hugeicons-react";
import { ArchivedItem } from "@/app/_server/actions/archived";
import { formatRelativeTime } from "@/app/_utils/date-utils";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { ItemTypes } from "@/app/_types/enums";
import { useTranslations } from "next-intl";

interface ArchivedItemCardProps {
  item: ArchivedItem;
  onUnarchive: (item: ArchivedItem) => void;
}

export const ArchivedItemCard = ({
  item,
  onUnarchive,
}: ArchivedItemCardProps) => {
  const t = useTranslations();
  const Icon =
    item.type === ItemTypes.CHECKLIST ? CheckmarkSquare04Icon : File02Icon;

  return (
    <div className="jotty-archived-item-card bg-card border border-border rounded-jotty p-4 hover:shadow-md hover:border-primary/50 transition-all duration-200 group flex flex-col h-full">
      <div className="flex items-start gap-2 mb-3">
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <h3
          className="font-medium text-foreground flex-1 leading-snug line-clamp-2"
          title={item.title}
        >
          {item.title}
        </h3>
      </div>

      <div className="flex items-center justify-between text-sm lg:text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-1">
          <span className="capitalize">{item.type === ItemTypes.CHECKLIST ? t('auditLogs.checklist') : t('auditLogs.note')}</span>
          {item.isShared && (
            <span className="text-md lg:text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">{t('common.shared')}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Clock01Icon className="h-3 w-3" />
          <span>
            {item.updatedAt ? formatRelativeTime(item.updatedAt, t) : t("profile.unknown")}
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onUnarchive(item)}
        className="w-full mt-auto"
      >
        <Archive02Icon className="h-3 w-3 mr-1.5" />
        {t('common.unarchive')}
      </Button>
    </div>
  );
};
