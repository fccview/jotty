import { Button } from "../Buttons/Button";
import {
  Upload01Icon,
  CheckmarkCircle04Icon,
  AlertCircleIcon,
} from "hugeicons-react";
import { formatFileSize } from "@/app/_utils/file-icon-utils";
import { Orbit01Icon } from "hugeicons-react";
import { Logo } from "../Layout/Logo/Logo";
import { useTranslations } from "next-intl";

interface FileUploadProps {
  activeTab: "images" | "videos" | "files";
  selectedFile: File | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  isUploading: boolean;
  uploadError?: string;
  fileSizeError?: string;
}

export const FileUpload = ({
  activeTab,
  selectedFile,
  onFileSelect,
  onUpload,
  isUploading,
  uploadError,
  fileSizeError,
}: FileUploadProps) => {
  const t = useTranslations();
  return (
  <div className="jotty-file-upload p-6 border-b border-border">
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <input
        type="file"
        accept={
          activeTab === "images"
            ? "image/*"
            : activeTab === "videos"
              ? "video/*"
              : "*"
        }
        onChange={onFileSelect}
        className="hidden"
        id="file-upload"
      />
      <Button
        variant="outline"
        onClick={() => document.getElementById("file-upload")?.click()}
        className="w-full sm:w-auto"
      >
        <Upload01Icon className="h-4 w-4 mr-2" /> Choose{" "}
        {activeTab === "images" ? "Image" : "File"}
      </Button>
      {selectedFile && (
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isUploading ? (
                <Logo className="h-4 w-4 animate-pulse" />
              ) : uploadError ? (
                <AlertCircleIcon className="h-4 w-4 text-destructive flex-shrink-0" />
              ) : (
                <CheckmarkCircle04Icon className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
              <span className="text-sm text-foreground truncate">
                {selectedFile.name}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </span>
            {!isUploading && !uploadError && (
              <Button onClick={onUpload} size="sm" className="w-full sm:w-auto">{t('common.upload')}</Button>
            )}
          </div>

          {isUploading && (
            <div className="w-full text-center">
              <div className="text-sm text-muted-foreground">
                Uploading file...
              </div>
            </div>
          )}

          {uploadError && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-jotty">
              {uploadError}
            </div>
          )}

          {fileSizeError && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-jotty">
              {fileSizeError}
            </div>
          )}
        </div>
      )}
    </div>
  </div>
  );
};
