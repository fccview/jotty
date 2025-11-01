import { Loader2 } from "lucide-react";
import { FileItem } from "@/app/_server/actions/upload";
import { FileCard } from "../Cards/FileCard";
import { ImageIcon, File } from "lucide-react";

interface FileGridProps {
  files: FileItem[];
  isLoading: boolean;
  activeTab: "images" | "videos" | "files";
  onFileClick: (
    url: string,
    type: "image" | "video" | "file",
    fileName: string,
    mimeType: string
  ) => void;
  onDeleteFile: (
    fileName: string,
    fileType: "image" | "video" | "file"
  ) => void;
}

export const FileGrid = ({
  files,
  isLoading,
  activeTab,
  onFileClick,
  onDeleteFile,
}: FileGridProps) => {
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="jotty-file-grid-loading text-center py-12">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading {activeTab}...</p>
        </div>
      );
    }

    if (files.length === 0) {
      return (
        <div className="jotty-file-grid-empty text-center py-12 text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            {activeTab === "images" ? (
              <ImageIcon className="h-8 w-8" />
            ) : (
              <File className="h-8 w-8" />
            )}
          </div>
          <p className="text-lg font-medium">No {activeTab} found</p>
        </div>
      );
    }

    return (
      <div className="jotty-file-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {files.map((file: FileItem) => (
          <FileCard
            key={file.fileName}
            file={file}
            onSelect={() =>
              onFileClick(file.url, file.type, file.name, file.mimeType)
            }
            onDelete={() => onDeleteFile(file.fileName, file.type)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="jotty-file-grid-container flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
      {renderContent()}
    </div>
  );
};
