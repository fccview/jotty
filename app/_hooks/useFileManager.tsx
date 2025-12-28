import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  getFiles,
  uploadFile,
  deleteFile,
  FileItem,
} from "@/app/_server/actions/upload";
import { MAX_FILE_SIZE } from "@/app/_consts/files";
import { useAppMode } from "@/app/_providers/AppModeProvider";

export const useFileManager = () => {
  const t = useTranslations();
  const { appSettings } = useAppMode();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"images" | "videos" | "files">("images");

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getFiles();
      if (result.success && result.data) setFiles(result.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileSizeError(null);
      setUploadError(null);
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    if (selectedFile.size > (appSettings?.maximumFileSize || MAX_FILE_SIZE)) {
      const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(1);
      const maxSizeMB = ((appSettings?.maximumFileSize || MAX_FILE_SIZE) / (1024 * 1024)).toFixed(0);
      setFileSizeError(t('common.fileTooLarge', { maxSizeMB, fileSizeMB }));
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setFileSizeError(null);

    const formData = new FormData();
    formData.append("file", selectedFile as Blob);

    try {
      const result = await uploadFile(formData);
      if (result.success) {
        setSelectedFile(null);
        await loadFiles();
      } else {
        setUploadError(result.error || t('common.uploadFailed'));
      }
    } catch (error) {
      setUploadError(t('common.uploadFailedRetry'));
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        setUploadError(null);
      }, 2000);
    }
  };

  const handleDeleteFile = async (
    fileName: string,
    fileType: "image" | "video" | "file"
  ) => {
    if (!window.confirm(t('common.confirmDeleteItem', { itemTitle: fileName }))) return;
    const formData = new FormData();
    formData.append("fileName", fileName);
    formData.append("fileType", fileType);
    const result = await deleteFile(formData);
    if (result.success) await loadFiles();
    else alert(result.error || t('common.failedToDeleteFile'));
  };

  const filteredFiles = useMemo(
    () =>
      files.filter((file) => {
        if (activeTab === "images") return file.type === "image";
        if (activeTab === "videos") return file.type === "video";
        return file.type === "file";
      }),
    [files, activeTab]
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
    handleDeleteFile,
    filteredFiles,
  };
};
