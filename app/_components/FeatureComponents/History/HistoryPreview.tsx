"use client";

import {
  RotateLeft01Icon,
  ArrowLeft01Icon,
  GitCompareIcon,
  File02Icon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useTranslations } from "next-intl";
import { HistoryEntry, HistoryVersion } from "@/app/_server/actions/history";
import {
  getActionLabel,
  getActionColor,
  DiffLine,
} from "@/app/_utils/history-utils";
import { formatRelativeTime } from "@/app/_utils/date-utils";
import { UnifiedMarkdownRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";

type ViewMode = "preview" | "diff";

interface HistoryPreviewProps {
  selectedEntry: HistoryEntry | null;
  selectedVersion: HistoryVersion | null;
  viewMode: ViewMode;
  diffLines: DiffLine[];
  onBackToList: () => void;
  onToggleViewMode: () => void;
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

export const HistoryPreview = ({
  selectedEntry,
  selectedVersion,
  viewMode,
  diffLines,
  onBackToList,
  onToggleViewMode,
  onRestore,
}: HistoryPreviewProps) => {
  const t = useTranslations();

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4 pb-4">
        <Button variant="ghost" size="sm" onClick={onBackToList}>
          <ArrowLeft01Icon className="h-4 w-4 mr-1" />
          {t("common.back")}
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant={viewMode === "diff" ? "default" : "outline"}
            size="sm"
            onClick={onToggleViewMode}
            aria-label={
              viewMode === "diff"
                ? t("history.viewContent")
                : t("history.viewDiff")
            }
          >
            <span className="hidden lg:inline">
              {viewMode === "diff"
                ? t("history.viewContent")
                : t("history.viewDiff")}
            </span>

            <span className="lg:hidden">
              {viewMode === "diff" ? <File02Icon /> : <GitCompareIcon />}
            </span>
          </Button>
          {selectedEntry?.action !== "move" && (
            <Button
              variant="default"
              size="sm"
              onClick={() => selectedEntry && onRestore(selectedEntry)}
            >
              <RotateLeft01Icon className="h-4 w-4 mr-1" />
              <span className="hidden lg:inline">{t("history.restore")}</span>
            </Button>
          )}
        </div>
      </div>

      {viewMode === "diff" ? (
        <div className="max-h-[60vh] overflow-auto rounded-jotty border border-border bg-card">
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
            {diffLines.map((line, idx) => (
              <div
                key={idx}
                className={`${line.type === "added"
                    ? "bg-primary/20 text-primary"
                    : line.type === "removed"
                      ? "bg-destructive/20 text-destructive"
                      : "text-muted-foreground"
                  }`}
              >
                <span className="inline-block w-6 text-muted-foreground text-right mr-3 select-none">
                  {line.type === "added"
                    ? "+"
                    : line.type === "removed"
                      ? "-"
                      : " "}
                </span>
                {line.content}
              </div>
            ))}
          </pre>
        </div>
      ) : (
        <div className="max-h-[60vh] overflow-auto rounded-jotty border border-border bg-card p-4">
          <UnifiedMarkdownRenderer content={selectedVersion?.content || ""} />
        </div>
      )}
    </>
  );
};

export type { DiffLine, ViewMode };
