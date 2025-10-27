"use client";

import { Download, Eye } from "lucide-react";
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
    <span className={`inline-block ${className}`}>
      <span className="bg-card border border-border rounded-lg p-4 max-w-sm hover:shadow-lg transition-all duration-200 hover:border-primary/20 group block">
        <span className="flex items-center gap-3">
          <span className="flex-shrink-0 p-2 bg-muted rounded-lg group-hover:bg-accent transition-colors block">
            {getFileIcon(mimeType, fileName)}
          </span>
          <span className="flex-1 min-w-0">
            <span
              className="font-medium text-sm text-foreground truncate block"
              title={displayName}
            >
              {displayName}
            </span>
            <span className="text-xs text-muted-foreground mt-1 !mb-0 block">
              {getFileTypeDisplay(mimeType, fileName)}
            </span>
          </span>
          <span className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(url, "_blank")}
              className="h-8 w-8 p-0 hover:bg-primary/10"
              title={t("cards.open_file")}
            >
              <Eye className="h-4 w-4" />
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
              className="h-8 w-8 p-0 hover:bg-primary/10"
              title={t("cards.download_file")}
            >
              <Download className="h-4 w-4" />
            </Button>
          </span>
        </span>
      </span>
    </span>
  );
};
