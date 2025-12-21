import { FileItem } from "@/app/_server/actions/upload";
import { getFileIcon, formatFileSize } from "@/app/_utils/file-icon-utils";
import Image from "next/image";
import { Button } from "../Buttons/Button";
import { ViewIcon, Download01Icon, Delete03Icon } from "hugeicons-react";
import { useTranslations } from "next-intl";

interface FileCardProps {
  file: FileItem;
  onSelect: () => void;
  onDelete: () => void;
}

export const FileCard = ({ file, onSelect, onDelete }: FileCardProps) => {
  const t = useTranslations();
  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };
  return (
    <div className="jotty-file-card relative group">
      <div
        className="bg-card border border-border rounded-md p-3 sm:p-4 cursor-pointer hover:ring-2 hover:ring-ring transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
        onClick={onSelect}
      >
        <div className="aspect-square bg-muted rounded-jotty overflow-hidden mb-3 relative">
          {file.type === "image" ? (
            <Image
              src={file.url}
              alt={file.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              {getFileIcon(file.mimeType, file.fileName)}
            </div>
          )}
        </div>
        <h3
          className="font-medium text-xs sm:text-sm text-foreground truncate"
          title={file.name}
        >
          {file.name}
        </h3>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.size)}
        </p>
      </div>
      <div className="absolute top-1 right-1 sm:top-2 sm:right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
          onClick={(e) =>
            handleAction(e, () => window.open(file.url, "_blank"))
          }
          title={t('common.openFile')}
        >
          <ViewIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
          onClick={(e) =>
            handleAction(e, () => {
              const a = document.createElement("a");
              a.href = file.url;
              a.download = file.name;
              a.click();
            })
          }
          title={t('common.downloadFile')}
        >
          <Download01Icon className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8 bg-destructive/80 backdrop-blur-sm hover:bg-destructive"
          onClick={(e) => handleAction(e, onDelete)}
          title={t('common.deleteFile')}
        >
          <Delete03Icon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
