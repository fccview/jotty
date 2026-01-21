"use client";

import { Download01Icon, ViewIcon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { getFileIcon, getFileTypeDisplay } from "@/app/_utils/file-icon-utils";
import { useTranslations } from "next-intl";

interface FileAttachmentProps {
  url: string;
  fileName: string;
  mimeType: string;
  className?: string;
}

export const FileAttachment = ({
  url,
  fileName,
  mimeType,
  className = "",
}: FileAttachmentProps) => {
  const t = useTranslations();
  const displayName = fileName.replace(/ \(\d+\)/, "").replace(/\.\w+$/, "");

  return (
    <span className={`jotty-file-attachment inline-block ${className}`}>
      <span className="jotty-file-attachment-container bg-card border border-border rounded-jotty p-4 max-w-sm hover:shadow-lg transition-all duration-200 hover:border-primary/20 group block">
        <span className="jotty-file-attachment-content flex items-center gap-3">
          <span className="jotty-file-attachment-icon flex-shrink-0 p-2 bg-primary text-primary-foreground rounded-jotty group-hover:bg-accent group-hover:text-accent-foreground transition-colors block">
            {getFileIcon(mimeType, fileName)}
          </span>
          <span className="flex-1 min-w-0">
            <span
              className="jotty-file-attachment-title font-medium text-md lg:text-sm text-foreground truncate block"
              title={displayName}
            >
              {displayName}
            </span>
            <span className="jotty-file-attachment-type text-sm lg:text-xs text-muted-foreground mt-1 !mb-0 block">
              {getFileTypeDisplay(mimeType, fileName)}
            </span>
          </span>
          <span className="jotty-file-attachment-actions flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(url, "_blank")}
              className="jotty-file-attachment-view-button h-8 w-8 p-0"
              aria-label={t('common.openFile')}
            >
              <ViewIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const link = document.createElement("a");
                link.href = url;
                link.download = fileName;
                link.click();
              }}
              className="jotty-file-attachment-download-button h-8 w-8 p-0"
              aria-label={t('common.downloadFile')}
            >
              <Download01Icon className="h-4 w-4" />
            </Button>
          </span>
        </span>
      </span>
    </span>
  );
};
