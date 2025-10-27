"use client";

import { Loader2, CheckCircle, AlertCircle, Upload } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useTranslations } from "next-intl";

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
    const t = useTranslations();
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3">
                        {isUploading ? (
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        ) : uploadError ? (
                            <AlertCircle className="h-8 w-8 text-destructive" />
                        ) : (
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        )}
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-foreground">
                                {isUploading ? t("upload.uploading_file_title") : uploadError ? t("upload.upload_failed") : t("upload.upload_complete")}
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
                                {t("upload.uploading_file")}
                            </div>
                        </div>
                    )}

                    {uploadError && (
                        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md w-full text-center">
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
                                {t("global.cancel")}
                            </Button>
                        )}
                        {uploadError && onRetry && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onRetry}
                            >
                                {t("global.retry")}
                            </Button>
                        )}
                        {!isUploading && !uploadError && (
                            <Button
                                size="sm"
                                onClick={() => window.location.reload()}
                            >
                                {t("global.close")}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
