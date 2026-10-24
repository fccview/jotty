import type { FileItem } from "@/app/_types";
import { FileCard } from "../Cards/FileCard";
import { Image02Icon, File02Icon, Video02Icon } from "hugeicons-react";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";
import { useTranslations } from "next-intl";
import type { FileTab } from "@/app/_hooks/useFileManager";

interface FileGridProps {
  files: FileItem[];
  isLoading: boolean;
  activeTab?: FileTab;
  emptyText?: string;
  onFileClick: (file: FileItem) => void;
  onDeleteFile?: (file: FileItem) => void;
}

const EMPTY_ICONS: Record<FileTab, typeof Image02Icon> = {
  images: Image02Icon,
  videos: Video02Icon,
  files: File02Icon,
};

export const FileGrid = ({
  files,
  isLoading,
  activeTab,
  emptyText,
  onFileClick,
  onDeleteFile,
}: FileGridProps) => {
  const t = useTranslations();
  const EmptyIcon = EMPTY_ICONS[activeTab || "files"];

  if (isLoading && files.length === 0) {
    return (
      <div className="jotty-file-grid-loading flex items-center justify-center min-h-[30vh]">
        <Logo className="h-8 w-8 animate-pulse" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="jotty-file-grid-empty text-center py-12 text-muted-foreground">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <EmptyIcon className="h-8 w-8" />
        </div>
        <p className="text-lg font-medium">
          {emptyText || t(`attachments.empty.${activeTab || "files"}`)}
        </p>
      </div>
    );
  }

  return (
    <div className="jotty-file-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {files.map((file) => (
        <FileCard
          key={`${file.itemUuid || ""}/${file.fileName}`}
          file={file}
          onSelect={() => onFileClick(file)}
          onDelete={onDeleteFile ? () => onDeleteFile(file) : undefined}
        />
      ))}
    </div>
  );
};
