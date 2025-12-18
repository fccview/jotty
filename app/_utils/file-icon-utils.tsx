import {
  FolderZipIcon,
  File02Icon,
  Video02Icon,
  MusicNoteSquare01Icon,
  SourceCodeIcon,
  Database01Icon,
  Presentation01Icon,
  Image02Icon,
} from "hugeicons-react";

export const getFileIcon = (mimeType: string, fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (mimeType.startsWith("image/")) {
    return <Image02Icon className="h-6 w-6" />;
  }

  if (mimeType === "application/pdf") {
    return <File02Icon className="h-6 w-6" />;
  }

  if (mimeType.includes("word") || ext === "doc" || ext === "docx") {
    return <File02Icon className="h-6 w-6" />;
  }

  if (mimeType.includes("excel") || ext === "xls" || ext === "xlsx") {
    return <File02Icon className="h-6 w-6" />;
  }

  if (mimeType.includes("powerpoint") || ext === "ppt" || ext === "pptx") {
    return <Presentation01Icon className="h-6 w-6" />;
  }

  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("7z") ||
    ext === "zip" ||
    ext === "rar" ||
    ext === "7z" ||
    ext === "tar" ||
    ext === "gz"
  ) {
    return <FolderZipIcon className="h-6 w-6" />;
  }

  if (mimeType.startsWith("video/")) {
    return <Video02Icon className="h-6 w-6" />;
  }

  if (mimeType.startsWith("audio/")) {
    return <MusicNoteSquare01Icon className="h-6 w-6" />;
  }

  if (
    mimeType.startsWith("text/") ||
    ext === "txt" ||
    ext === "csv" ||
    ext === "json"
  ) {
    return <SourceCodeIcon className="h-6 w-6" />;
  }

  if (mimeType.includes("database") || ext === "sql" || ext === "db") {
    return <Database01Icon className="h-6 w-6" />;
  }

  return <File02Icon className="h-6 w-6" />;
};

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const getFileTypeDisplay = (mimeType: string, fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("word") || ext === "doc" || ext === "docx")
    return "Word";
  if (mimeType.includes("excel") || ext === "xls" || ext === "xlsx")
    return "Excel";
  if (mimeType.includes("powerpoint") || ext === "ppt" || ext === "pptx")
    return "PowerPoint";

  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("7z") ||
    ext === "zip" ||
    ext === "rar" ||
    ext === "7z" ||
    ext === "tar" ||
    ext === "gz"
  ) {
    return "Archive";
  }

  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType.startsWith("text/")) return "Text";

  if (mimeType === "application/octet-stream") {
    if (ext === "zip" || ext === "rar" || ext === "7z") return "FolderZipIcon";
    if (ext === "pdf") return "PDF";
    if (ext === "doc" || ext === "docx") return "Word";
    if (ext === "xls" || ext === "xlsx") return "Excel";
    if (ext === "ppt" || ext === "pptx") return "PowerPoint";
    if (ext === "txt" || ext === "csv" || ext === "json") return "Text";
    if (ext === "mp4" || ext === "avi" || ext === "mov") return "Video";
    if (ext === "mp3" || ext === "wav" || ext === "flac") return "Audio";
    if (ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "gif")
      return "Image";
    return ext?.toUpperCase() || "File";
  }

  const subtype = mimeType.split("/")[1];
  if (subtype) {
    return subtype.charAt(0).toUpperCase() + subtype.slice(1);
  }

  return "File";
};
