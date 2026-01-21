"use client";

import {
  RotateLeft01Icon,
  InformationCircleIcon,
  ViewIcon,
  GitCompareIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useTranslations } from "next-intl";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";
import { HistoryEntry } from "@/app/_server/actions/history";
import { getActionLabel, getActionColor } from "@/app/_utils/history-utils";
import { formatRelativeTime } from "@/app/_utils/date-utils";

interface HistoryListProps {
  entries: HistoryEntry[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isLoadingVersion: boolean;
  hasMore: boolean;
  error: string | null;
  selectedEntry: HistoryEntry | null;
  onRetry: () => void;
  onLoadMore: () => void;
  onViewVersion: (entry: HistoryEntry) => void;
  onRestore: (entry: HistoryEntry) => void;
}

const getActionBadgeClasses = (action: string): string => {
  const color = getActionColor(action);
  const baseClasses = "px-2 py-0.5 rounded text-xs font-medium";
  const colorClasses: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    success:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    warning:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    destructive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return `${baseClasses} ${colorClasses[color]}`;
};

export const HistoryList = ({
  entries,
  isLoading,
  isLoadingMore,
  isLoadingVersion,
  hasMore,
  error,
  selectedEntry,
  onRetry,
  onLoadMore,
  onViewVersion,
  onRestore,
}: HistoryListProps) => {
  const t = useTranslations();

  return (
    <>
      <div className="flex items-start gap-2 text-muted-foreground text-sm bg-muted/50 rounded-jotty p-3">
        <InformationCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span>{t("history.manualSavesOnly")}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Logo className="h-8 w-8 animate-pulse" />
        </div>
      ) : error ? (
        <div className="text-center py-8 text-destructive">
          <p>{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-4"
          >
            {t("common.retry")}
          </Button>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <GitCompareIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">{t("history.noHistory")}</p>
          <p className="text-sm mt-1">{t("history.noHistoryDescription")}</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {entries.map((entry, index) => (
            <div
              key={`${entry.commitHash}-${index}`}
              className="flex items-center justify-between p-3 rounded-jotty border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={getActionBadgeClasses(entry.action)}>
                    {getActionLabel(entry.action, t)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(entry.date, t)}
                  </span>
                </div>
                <p className="text-sm truncate" title={entry.title}>
                  {entry.title}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                {entry.action !== "init" && entry.action !== "delete" && entry.action !== "move" && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewVersion(entry)}
                      disabled={isLoadingVersion}
                    >
                      {isLoadingVersion &&
                        selectedEntry?.commitHash === entry.commitHash ? (
                        <Logo className="h-4 w-4 animate-pulse" />
                      ) : (
                        <ViewIcon className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRestore(entry)}
                    >
                      <RotateLeft01Icon className="h-4 w-4 mr-1" />
                      {t("history.restore")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="w-full"
              >
                {isLoadingMore ? (
                  <>
                    <Logo className="h-4 w-4 mr-2 animate-pulse" />
                    {t("common.loading")}
                  </>
                ) : (
                  t("history.loadMore")
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
