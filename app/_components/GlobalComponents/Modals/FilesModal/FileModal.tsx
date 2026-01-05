"use client";

import { useEffect } from "react";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { useFileManager } from "@/app/_hooks/useFileManager";
import { FileUpload } from "../../FormElements/FileUpload";
import { FileTabs } from "../../Tabs/FileTabs";
import { FileGrid } from "../../Layout/FileGrid";
import { useTranslations } from "next-intl";

interface FileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (
    url: string,
    type: "image" | "video" | "file",
    fileName: string,
    mimeType: string
  ) => void;
}

export const FileModal = ({
  isOpen,
  onClose,
  onSelectFile,
}: FileModalProps) => {
  const t = useTranslations();
  const {
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
    DeleteModal,
  } = useFileManager();

  useEffect(() => {
    if (isOpen) loadFiles();
  }, [isOpen, loadFiles]);

  const handleFileClick = (
    url: string,
    type: "image" | "video" | "file",
    fileName: string,
    mimeType: string
  ) => {
    onSelectFile(url, type, fileName, mimeType);
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t("common.filesAndImages")}
        className="!max-w-6xl !max-h-[90vh] sm:!w-[95vw] !w-[100vw]"
      >
        <div className="flex flex-col h-full max-h-[calc(90vh-5rem)]">
          <FileTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          <FileUpload
            activeTab={activeTab}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onUpload={handleUpload}
            isUploading={isUploading}
            uploadError={uploadError || undefined}
            fileSizeError={fileSizeError || undefined}
          />
          <FileGrid
            files={filteredFiles}
            isLoading={isLoading}
            activeTab={activeTab}
            onFileClick={handleFileClick}
            onDeleteFile={handleDeleteFile}
          />
        </div>
      </Modal>
      <DeleteModal />
    </>
  );
};
