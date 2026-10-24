import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  attachTo,
  deleteAttachment,
  listAttachments,
  uploadFile,
} from "@/app/_server/actions/attachments";
import type { FileItem } from "@/app/_types";
import { MAX_FILE_SIZE } from "@/app/_consts/files";
import { AttachmentKinds } from "@/app/_consts/attachments";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useToast } from "@/app/_providers/ToastProvider";
import { useWebSocket } from "@/app/_providers/WebSocketProvider";
import { useAttachmentError } from "@/app/_hooks/useAttachmentError";
import { ConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConfirmModal";

export type FileTab = "images" | "videos" | "files";

const TAB_KINDS: Record<FileTab, AttachmentKinds> = {
  images: AttachmentKinds.IMAGE,
  videos: AttachmentKinds.VIDEO,
  files: AttachmentKinds.FILE,
};

export const useFileManager = (itemUuid?: string) => {
  const t = useTranslations();
  const explain = useAttachmentError();
  const { appSettings } = useAppMode();
  const { showToast } = useToast();
  const { subscribe } = useWebSocket();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<FileTab>("images");
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);

  const loadFiles = useCallback(async () => {
    if (!itemUuid) {
      setFiles([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await listAttachments(itemUuid);
      setFiles(result.success && result.data ? result.data : []);
      if (!result.success) console.warn("Could not list attachments:", result.error);
    } catch (error) {
      console.error("Error listing attachments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [itemUuid]);

  useEffect(
    () =>
      subscribe((event) => {
        if (event.type === "attachments" && itemUuid && event.entityId === itemUuid.toLowerCase()) {
          void loadFiles();
        }
      }),
    [subscribe, itemUuid, loadFiles],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileSizeError(null);
      setUploadError(null);
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !itemUuid) return;

    const limit = appSettings?.maximumFileSize || MAX_FILE_SIZE;
    if (selectedFile.size > limit) {
      const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(1);
      const maxSizeMB = (limit / (1024 * 1024)).toFixed(0);
      setFileSizeError(t("common.fileTooLarge", { maxSizeMB, fileSizeMB }));
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setFileSizeError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("itemUuid", itemUuid);

    try {
      const result = await uploadFile(formData);
      if (result.success) {
        setSelectedFile(null);
        await loadFiles();
      } else {
        setUploadError(explain(result.error, "common.uploadFailed"));
      }
    } catch (error) {
      console.error("Error uploading attachment:", error);
      setUploadError(t("common.uploadFailedRetry"));
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadError(null), 2000);
    }
  };

  const attachExisting = async (file: FileItem): Promise<FileItem | null> => {
    if (!itemUuid || !file.itemUuid) return null;

    try {
      const result = await attachTo(itemUuid, file.itemUuid, file.fileName);
      if (result.success && result.data) return result.data;
      showToast({ type: "error", title: explain(result.error, "attachments.attachFailed") });
    } catch (error) {
      console.error("Error attaching file:", error);
      showToast({ type: "error", title: t("attachments.attachFailed") });
    }
    return null;
  };

  const confirmDelete = async () => {
    if (!fileToDelete?.itemUuid) return;

    try {
      const result = await deleteAttachment(fileToDelete.itemUuid, fileToDelete.fileName);
      if (result.success) {
        await loadFiles();
      } else {
        showToast({ type: "error", title: explain(result.error, "common.failedToDeleteFile") });
      }
    } catch (error) {
      console.error("Error deleting attachment:", error);
      showToast({ type: "error", title: t("common.failedToDeleteFile") });
    }

    setFileToDelete(null);
  };

  const filteredFiles = useMemo(
    () => files.filter((file) => file.type === TAB_KINDS[activeTab]),
    [files, activeTab],
  );

  return {
    files,
    isLoading,
    isUploading,
    uploadError,
    fileSizeError,
    selectedFile,
    setSelectedFile,
    activeTab,
    setActiveTab,
    loadFiles,
    handleFileSelect,
    handleUpload,
    attachExisting,
    handleDeleteFile: setFileToDelete,
    filteredFiles,
    deleteModal: (
      <ConfirmModal
        isOpen={fileToDelete !== null}
        onClose={() => setFileToDelete(null)}
        onConfirm={confirmDelete}
        title={t("common.delete")}
        message={t("attachments.confirmDelete", { name: fileToDelete?.name || "" })}
        confirmText={t("common.delete")}
        variant="destructive"
      />
    ),
  };
};
