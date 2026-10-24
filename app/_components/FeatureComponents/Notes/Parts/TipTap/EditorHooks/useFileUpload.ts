import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { uploadFile } from "@/app/_server/actions/attachments";
import type { FileItem } from "@/app/_types";
import { MAX_FILE_SIZE } from "@/app/_consts/files";
import { useAttachmentError } from "@/app/_hooks/useAttachmentError";

interface UploadState {
  isUploading: boolean;
  uploadError: string | null;
  fileSizeError: string | null;
  uploadingFileName: string | null;
}

interface UploadCallbacks {
  onImageUpload: (url: string) => void;
  onFileUpload: (data: FileItem) => void;
}

export const useFileUpload = (maxFileSize?: number, itemUuid?: string) => {
  const t = useTranslations();
  const explain = useAttachmentError();
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    uploadError: null,
    fileSizeError: null,
    uploadingFileName: null,
  });

  const handleFileUpload = useCallback(
    async (
      file: File,
      callbacks: UploadCallbacks,
      showProgress: boolean = false
    ): Promise<void> => {
      const limit = maxFileSize || MAX_FILE_SIZE;

      if (file.size > limit) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        const maxSizeMB = (limit / (1024 * 1024)).toFixed(0);
        const errorMessage = t("common.fileTooLarge", { maxSizeMB, fileSizeMB });

        if (showProgress) {
          setState({
            isUploading: true,
            uploadError: null,
            fileSizeError: errorMessage,
            uploadingFileName: file.name,
          });
          setTimeout(() => {
            setState({
              isUploading: false,
              uploadError: null,
              fileSizeError: null,
              uploadingFileName: null,
            });
          }, 3000);
        }
        return;
      }

      if (showProgress) {
        setState({
          isUploading: true,
          uploadError: null,
          fileSizeError: null,
          uploadingFileName: file.name,
        });
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("itemUuid", itemUuid || "");
        const result = await uploadFile(formData);

        if (result.success && result.data) {
          if (result.data.type === "image") {
            callbacks.onImageUpload(result.data.url);
          } else {
            callbacks.onFileUpload(result.data);
          }

          if (showProgress) {
            setTimeout(() => {
              setState({
                isUploading: false,
                uploadError: null,
                fileSizeError: null,
                uploadingFileName: null,
              });
            }, 1000);
          }
        } else {
          if (showProgress) {
            setState({
              isUploading: false,
              uploadError: explain(result.error, "common.uploadFailed"),
              fileSizeError: null,
              uploadingFileName: null,
            });
          } else {
            console.error("Upload failed:", result.error);
          }
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        if (showProgress) {
          setState({
            isUploading: false,
            uploadError: t("common.uploadFailedRetry"),
            fileSizeError: null,
            uploadingFileName: null,
          });
        }
      }
    },
    [maxFileSize, itemUuid, t, explain]
  );

  const resetErrors = useCallback(() => {
    setState((prev) => ({
      ...prev,
      uploadError: null,
      fileSizeError: null,
      isUploading: false,
    }));
  }, []);

  return {
    ...state,
    handleFileUpload,
    resetErrors,
  };
};
