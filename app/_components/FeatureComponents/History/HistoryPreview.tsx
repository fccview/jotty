"use client";

import { RotateLeft01Icon, ArrowLeft01Icon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useTranslations } from "next-intl";
import { HistoryEntry, HistoryVersion } from "@/app/_server/actions/history";
import {
  formatHistoryDate,
  getActionLabel,
  getActionColor,
} from "@/app/_utils/history-utils";
import { UnifiedMarkdownRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";

type ViewMode = "preview" | "diff";

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNumber?: number;
}

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
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={onBackToList}>
          <ArrowLeft01Icon className="h-4 w-4 mr-1" />
          {t("common.back")}
        </Button>
        <div className="flex-1">
          <span
            className={getActionBadgeClasses(selectedEntry?.action || "update")}
          >
            {getActionLabel(selectedEntry?.action || "update")}
          </span>
          <span className="text-sm text-muted-foreground ml-2">
            {formatHistoryDate(selectedEntry?.date || "")}
          </span>
        </div>
        <Button
          variant={viewMode === "diff" ? "default" : "outline"}
          size="sm"
          onClick={onToggleViewMode}
        >
          {viewMode === "diff"
            ? t("history.viewContent")
            : t("history.viewDiff")}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => selectedEntry && onRestore(selectedEntry)}
        >
          <RotateLeft01Icon className="h-4 w-4 mr-1" />
          {t("history.restore")}
        </Button>
      </div>

      {viewMode === "diff" ? (
        <div className="max-h-[60vh] overflow-auto rounded-jotty border border-border bg-card">
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
            {diffLines.map((line, idx) => (
              <div
                key={idx}
                className={`${
                  line.type === "added"
                    ? "bg-primary/10 text-primary"
                    : line.type === "removed"
                    ? "bg-destructive/10 text-destructive"
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
