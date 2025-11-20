"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { ProgressBar } from "@/app/_components/GlobalComponents/Statistics/ProgressBar";
import { ExportProgress, ExportResult, User } from "@/app/_types";
import {
  exportAllChecklistsNotes,
  exportUserChecklistsNotes,
  exportAllUsersData,
  exportWholeDataFolder,
  getExportProgress,
} from "@/app/_server/actions/export";
import { useTranslations } from "next-intl";

type ExportType =
  | "all_checklists_notes"
  | "user_checklists_notes"
  | "all_users_data"
  | "whole_data_folder";

interface ExportOption {
  id: ExportType;
  title: string;
  description: string;
  requiresUserSelection: boolean;
}

const getExportOptions = (t: any): ExportOption[] => [
  {
    id: "all_checklists_notes",
    title: t("admin.export.all_checklists_notes"),
    description: t("admin.export.all_checklists_notes_description"),
    requiresUserSelection: false,
  },
  {
    id: "user_checklists_notes",
    title: t("admin.export.user_checklists_notes"),
    description: t("admin.export.user_checklists_notes_description"),
    requiresUserSelection: true,
  },
  {
    id: "all_users_data",
    title: t("admin.export.all_users_data"),
    description: t("admin.export.all_users_data_description"),
    requiresUserSelection: false,
  },
  {
    id: "whole_data_folder",
    title: t("admin.export.whole_data_folder"),
    description: t("admin.export.whole_data_folder_description"),
    requiresUserSelection: false,
  },
];

interface ExportContentProps {
  users: User[];
}

export const ExportContent = ({ users }: ExportContentProps) => {
  const t = useTranslations();
  const exportOptions = getExportOptions(t);

  const [selectedExportType, setSelectedExportType] = useState<ExportType>(
    exportOptions[3].id
  );
  const [selectedUser, setSelectedUser] = useState<string | undefined>(
    undefined
  );
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress>({
    progress: 0,
    message: "",
  });
  const [downloadUrl, setDownloadUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const selectedOption = useMemo(
    () => exportOptions.find((opt) => opt.id === selectedExportType)!,
    [selectedExportType, exportOptions]
  );

  React.useEffect(() => {
    if (!exporting) return;

    const interval = setInterval(async () => {
      const currentProgress = await getExportProgress();
      setProgress(currentProgress);
      if (
        currentProgress.progress === 100 ||
        currentProgress.message.includes("failed")
      ) {
        setExporting(false);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [exporting]);

  const handleExport = async () => {
    setExporting(true);
    setProgress({ progress: 0, message: t("admin.export.initiating") });
    setDownloadUrl(undefined);
    setError(undefined);

    try {
      let result: ExportResult | undefined;
      switch (selectedOption.id) {
        case "all_checklists_notes":
          result = await exportAllChecklistsNotes();
          break;
        case "user_checklists_notes":
          if (!selectedUser) {
            setError(t("admin.export.select_user"));
            setExporting(false);
            return;
          }
          result = await exportUserChecklistsNotes(selectedUser);
          break;
        case "all_users_data":
          result = await exportAllUsersData();
          break;
        case "whole_data_folder":
          result = await exportWholeDataFolder();
          break;
      }

      if (result?.success && result.downloadUrl) {
        setDownloadUrl(result.downloadUrl);
        setProgress({
          progress: 100,
          message: t("admin.export.completed_success"),
        });
      } else {
        setError(result?.error || t("admin.export.failed"));
        setProgress({ progress: 100, message: t("admin.export.failed") });
      }
    } catch (err: any) {
      console.error("Export error:", err);
      setError(err.message || t("admin.export.unexpected_error"));
      setProgress({ progress: 100, message: t("admin.export.failed_error") });
    } finally {
      if (error || !downloadUrl) {
        setExporting(false);
      }
    }
  };

  const isExportDisabled =
    exporting || (selectedOption.requiresUserSelection && !selectedUser);

  return (
    <div className="py-6 bg-card space-y-8">
      <div>
        <h2 className="text-2xl font-bold">{t("admin.export.data_export_options")}</h2>
        <p className="text-muted-foreground">
          {t("admin.export.select_export_type")}
        </p>
      </div>

      <div className="space-y-4 p-6 rounded-lg bg-muted/50 shadow-sm">
        <Dropdown
          onChange={(value) => setSelectedExportType(value as ExportType)}
          value={selectedExportType}
          options={exportOptions.map((opt) => ({
            id: opt.id,
            name: opt.title,
          }))}
          disabled={exporting}
          className="w-full bg-background"
        />

        <p className="text-muted-foreground pt-2 min-h-[40px] font-medium text-sm">
          {selectedOption.description}
        </p>

        {selectedOption.requiresUserSelection && (
          <div className="pt-2">
            <Dropdown
              onChange={setSelectedUser}
              value={selectedUser || ""}
              options={users.map((user) => ({
                id: user.username,
                name: user.username,
              }))}
              disabled={exporting}
              placeholder={t("admin.export.select_user_placeholder")}
              className="w-full"
            />
          </div>
        )}

        <Button
          onClick={handleExport}
          disabled={isExportDisabled}
          className="w-full md:w-auto"
        >
          {t("admin.export.export_data")}
        </Button>
      </div>

      {exporting && (
        <div className="space-y-2">
          <ProgressBar progress={progress.progress} />
          <p className="text-sm text-muted-foreground font-medium text-center">
            {progress.message}
          </p>
        </div>
      )}

      {downloadUrl && !exporting && (
        <div className="p-4 border rounded-md bg-secondary text-secondary-foreground text-center text-sm">
          <p>
            {t("admin.export.export_ready")}{" "}
            <a
              href={downloadUrl}
              download
              className="text-primary hover:underline font-medium"
            >
              {t("admin.export.click_to_download")}
            </a>
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 border border-destructive rounded-md bg-destructive/10 text-destructive text-center">
          <p className="font-medium">{t("admin.export.error")}: {error}</p>
        </div>
      )}
    </div>
  );
};
