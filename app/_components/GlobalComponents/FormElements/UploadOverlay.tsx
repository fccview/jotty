"use client";

import {
  Orbit01Icon,
  CheckmarkCircle04Icon,
  AlertCircleIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";

interface UploadOverlayProps {
  isVisible: boolean;
  isUploading: boolean;
  uploadError?: string;
  fileName?: string;
  onCancel?: () => void;
  onRetry?: () => void;
}

export const UploadOverlay = ({
  isVisible,
  isUploading,
  uploadError,
  fileName,
  onCancel,
  onRetry,
}: UploadOverlayProps) => {
  if (!isVisible) return null;

  return (
    <div className="jotty-upload-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-jotty p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            {isUploading ? (
              <Orbit01Icon className="h-8 w-8 animate-spin text-primary" />
            ) : uploadError ? (
              <AlertCircleIcon className="h-8 w-8 text-destructive" />
            ) : (
              <CheckmarkCircle04Icon className="h-8 w-8 text-green-500" />
            )}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">
                {isUploading
                  ? "Uploading File"
                  : uploadError
                  ? "Upload Failed"
                  : "Upload Complete"}
              </h3>
              {fileName && (
                <p className="text-sm text-muted-foreground truncate max-w-xs">
                  {fileName}
                </p>
              )}
            </div>
          </div>

          {isUploading && (
            <div className="w-full text-center">
              <div className="text-sm text-muted-foreground">
                Uploading file...
              </div>
            </div>
          )}

          {uploadError && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-jotty w-full text-center">
              {uploadError}
            </div>
          )}

          <div className="flex gap-2">
            {isUploading && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={!onCancel}
              >
                Cancel
              </Button>
            )}
            {uploadError && onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            )}
            {!isUploading && !uploadError && (
              <Button size="sm" onClick={() => window.location.reload()}>
                Close
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
