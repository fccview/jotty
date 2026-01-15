"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock01Icon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Modal } from "../Modal";
import { useTranslations } from "next-intl";
import {
  getHistory,
  getVersion,
  restoreNoteVersion,
  HistoryEntry,
  HistoryVersion,
} from "@/app/_server/actions/history";
import { ConfirmModal } from "../ConfirmationModals/ConfirmModal";
import { HistoryList } from "@/app/_components/FeatureComponents/History/HistoryList";
import {
  HistoryPreview,
  DiffLine,
  ViewMode,
} from "@/app/_components/FeatureComponents/History/HistoryPreview";

interface NoteHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteUuid: string;
  noteId: string;
  noteCategory: string;
  noteOwner: string;
  noteTitle: string;
  currentContent?: string;
  onRestore?: () => void;
}

type ModalViewMode = "list" | ViewMode;

const computeSimpleDiff = (
  oldContent: string,
  newContent: string
): DiffLine[] => {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");
  const result: DiffLine[] = [];

  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined) {
      result.push({ type: "added", content: newLine, lineNumber: i + 1 });
    } else if (newLine === undefined) {
      result.push({ type: "removed", content: oldLine, lineNumber: i + 1 });
    } else if (oldLine !== newLine) {
      result.push({ type: "removed", content: oldLine, lineNumber: i + 1 });
      result.push({ type: "added", content: newLine, lineNumber: i + 1 });
    } else {
      result.push({ type: "unchanged", content: oldLine, lineNumber: i + 1 });
    }
  }

  return result;
};

export const NoteHistoryModal = ({
  isOpen,
  onClose,
  noteUuid,
  noteId,
  noteCategory,
  noteOwner,
  noteTitle,
  currentContent = "",
  onRestore,
}: NoteHistoryModalProps) => {
  const t = useTranslations();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingVersion, setIsLoadingVersion] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<HistoryEntry | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const [viewMode, setViewMode] = useState<ModalViewMode>("list");
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<HistoryVersion | null>(
    null
  );

  const fetchHistory = useCallback(
    async (pageNum: number, append = false) => {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const result = await getHistory(
          noteUuid,
          noteId,
          noteCategory,
          noteOwner,
          pageNum,
          20
        );

        if (result.success && result.data) {
          if (append) {
            setEntries((prev) => [...prev, ...result.data!.entries]);
          } else {
            setEntries(result.data.entries);
          }
          setHasMore(result.data.hasMore);
          setPage(pageNum);
        } else {
          setError(result.error || t("history.fetchError"));
        }
      } catch {
        setError(t("history.fetchError"));
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [noteUuid, noteId, noteCategory, noteOwner, t]
  );

  const fetchVersion = useCallback(
    async (entry: HistoryEntry) => {
      setIsLoadingVersion(true);
      setSelectedEntry(entry);
      setError(null);

      try {
        const result = await getVersion(
          noteUuid,
          noteId,
          noteCategory,
          noteOwner,
          entry.commitHash
        );

        if (result.success && result.data) {
          setSelectedVersion(result.data);
          setViewMode("preview");
        } else {
          setError(result.error || t("history.fetchError"));
        }
      } catch {
        setError(t("history.fetchError"));
      } finally {
        setIsLoadingVersion(false);
      }
    },
    [noteUuid, noteId, noteCategory, noteOwner, t]
  );

  useEffect(() => {
    if (isOpen) {
      fetchHistory(1);
      setViewMode("list");
      setSelectedEntry(null);
      setSelectedVersion(null);
    }
  }, [isOpen, fetchHistory]);

  const handleLoadMore = () => {
    fetchHistory(page + 1, true);
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedEntry(null);
    setSelectedVersion(null);
  };

  const handleToggleViewMode = () => {
    setViewMode(viewMode === "diff" ? "preview" : "diff");
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;

    setIsRestoring(true);
    try {
      const result = await restoreNoteVersion(
        noteUuid,
        noteId,
        noteCategory,
        noteOwner,
        restoreTarget.commitHash
      );

      if (result.success) {
        onRestore?.();
        onClose();
        window?.location.reload();
      } else {
        setError(result.error || t("history.restoreError"));
      }
    } catch {
      setError(t("history.restoreError"));
    } finally {
      setIsRestoring(false);
      setRestoreTarget(null);
    }
  };

  if (!isOpen) return null;

  const diffLines =
    viewMode === "diff" && selectedVersion
      ? computeSimpleDiff(selectedVersion.content, currentContent)
      : [];

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2">
            <Clock01Icon className="h-5 w-5" />
            <span>{t("history.noteHistory")}</span>
          </div>
        }
        className="lg:!max-w-3xl"
      >
        <div className="space-y-4">
          {viewMode === "list" ? (
            <HistoryList
              entries={entries}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              isLoadingVersion={isLoadingVersion}
              hasMore={hasMore}
              error={error}
              selectedEntry={selectedEntry}
              onRetry={() => fetchHistory(1)}
              onLoadMore={handleLoadMore}
              onViewVersion={fetchVersion}
              onRestore={setRestoreTarget}
            />
          ) : (
            <HistoryPreview
              selectedEntry={selectedEntry}
              selectedVersion={selectedVersion}
              viewMode={viewMode as ViewMode}
              diffLines={diffLines}
              onBackToList={handleBackToList}
              onToggleViewMode={handleToggleViewMode}
              onRestore={setRestoreTarget}
            />
          )}

          <div className="flex justify-end pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              {t("common.close")}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
        title={t("history.restoreVersion")}
        message={t("history.restoreConfirm")}
        confirmText={isRestoring ? t("common.restoring") : t("history.restore")}
        cancelText={t("common.cancel")}
      />
    </>
  );
};
