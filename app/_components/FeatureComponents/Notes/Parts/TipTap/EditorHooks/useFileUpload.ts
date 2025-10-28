import { useState, useCallback } from "react";
import { uploadFile } from "@/app/_server/actions/upload";
import { MAX_FILE_SIZE } from "@/app/_consts/files";

interface UploadState {
  isUploading: boolean;
  uploadError: string | null;
  fileSizeError: string | null;
  uploadingFileName: string | null;
}

interface UploadCallbacks {
  onImageUpload: (url: string) => void;
  onFileUpload: (data: any) => void;
}

export const useFileUpload = (maxFileSize?: number) => {
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
        const errorMessage = `File is too large. Maximum size is ${maxSizeMB}MB. Your file is ${fileSizeMB}MB.`;

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
              uploadError: result.error || "Upload failed",
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
            uploadError: "Upload failed. Please try again.",
            fileSizeError: null,
            uploadingFileName: null,
          });
        }
      }
    },
    [maxFileSize]
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
