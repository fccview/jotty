"use server";

import path from "path";
import fs from "fs/promises";
import { getCurrentUser } from "@/app/_server/actions/users";
import { Modes } from "@/app/_types/enums";
import { getUserModeDir } from "../file";
import {
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
} from "@/app/_consts/files";
import { getSettings } from "../config";

export interface FileItem {
  fileName: string;
  name: string;
  url: string;
  type: "image" | "video" | "file";
  mimeType: string;
  size: number;
  uploadedAt: string;
}

function _getFileType(mimeType: string): "image" | "video" | "file" {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return "image";
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return "video";
  return "file";
}

function _sanitizeBaseName(name: string): string {
  const normalized = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const replaced = normalized.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return replaced.replace(/-+/g, "-").replace(/^[.-]+|[.-]+$/g, "");
}

function _getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypeMap: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx":
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".json": "application/json",
    ".zip": "application/zip",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  };
  return mimeTypeMap[ext] || "application/octet-stream";
}

export const uploadUserAvatar = async (formData: FormData) => {
  const settings = await getSettings();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    if (file.size > (settings?.maximumFileSize || MAX_FILE_SIZE)) {
      return {
        success: false,
        error: `File is too large. Maximum size is ${(
          (settings?.maximumFileSize || MAX_FILE_SIZE) /
          (1024 * 1024)
        ).toFixed(0)}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(
          1
        )}MB.`,
      };
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return {
        success: false,
        error: "Invalid file type. Only images are allowed.",
      };
    }

    const userDir = await getUserModeDir(Modes.NOTES);
    const targetDir = path.join(userDir, "images");
    await fs.mkdir(targetDir, { recursive: true });

    const originalExt = path.extname(file.name).toLowerCase();
    const originalBase = path.basename(file.name, originalExt);
    const sanitizedBase = _sanitizeBaseName(originalBase);
    let fileName = `${sanitizedBase}${originalExt}`;
    let counter = 1;

    while (
      await fs
        .access(path.join(targetDir, fileName))
        .then(() => true)
        .catch(() => false)
    ) {
      fileName = `${sanitizedBase}-${counter}${originalExt}`;
      counter++;
    }

    const filePath = path.join(targetDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const fileUrl = `/api/image/${user.username}/${encodeURIComponent(
      fileName
    )}`;

    return {
      success: true,
      data: {
        fileName: fileName,
        name: file.name,
        url: fileUrl,
        type: "image",
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      } as FileItem,
    };
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return { success: false, error: "Failed to upload avatar" };
  }
};

export const uploadFile = async (formData: FormData) => {
  try {
    const settings = await getSettings();
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    if (file.size > (settings?.maximumFileSize || MAX_FILE_SIZE)) {
      return {
        success: false,
        error: `File is too large. Maximum size is ${(
          (settings?.maximumFileSize || MAX_FILE_SIZE) /
          (1024 * 1024)
        ).toFixed(0)}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(
          1
        )}MB.`,
      };
    }

    const fileType = _getFileType(file.type);
    const userDir = await getUserModeDir(Modes.NOTES);
    const targetDir = path.join(
      userDir,
      fileType === "image"
        ? "images"
        : fileType === "video"
        ? "videos"
        : "files"
    );
    await fs.mkdir(targetDir, { recursive: true });

    const originalExt = path.extname(file.name).toLowerCase();
    const originalBase = path.basename(file.name, originalExt);
    const sanitizedBase = _sanitizeBaseName(originalBase);
    let fileName = `${sanitizedBase}${originalExt}`;
    let counter = 1;

    while (
      await fs
        .access(path.join(targetDir, fileName))
        .then(() => true)
        .catch(() => false)
    ) {
      fileName = `${sanitizedBase}-${counter}${originalExt}`;
      counter++;
    }

    const filePath = path.join(targetDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const fileUrl = `/${
      fileType === "image"
        ? "api/image"
        : fileType === "video"
        ? "api/video"
        : "api/file"
    }/${user.username}/${encodeURIComponent(fileName)}`;

    return {
      success: true,
      data: {
        fileName: fileName,
        name: file.name,
        url: fileUrl,
        type: fileType,
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      } as FileItem,
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    return { success: false, error: "Failed to upload file" };
  }
};

export const getFiles = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const userDir = await getUserModeDir(Modes.NOTES);
    const subDirs = [
      {
        type: "image" as const,
        path: path.join(userDir, "images"),
        api: "api/image",
      },
      {
        type: "video" as const,
        path: path.join(userDir, "videos"),
        api: "api/video",
      },
      {
        type: "file" as const,
        path: path.join(userDir, "files"),
        api: "api/file",
      },
    ];
    const allFiles: FileItem[] = [];

    for (const dirInfo of subDirs) {
      try {
        const filesInDir = await fs.readdir(dirInfo.path);
        for (const file of filesInDir) {
          const filePath = path.join(dirInfo.path, file);
          const stats = await fs.stat(filePath);
          const mimeType = _getMimeType(file);

          allFiles.push({
            fileName: file,
            name: file,
            url: `/${dirInfo.api}/${user.username}/${encodeURIComponent(file)}`,
            type: _getFileType(mimeType),
            mimeType,
            size: stats.size,
            uploadedAt: stats.birthtime.toISOString(),
          });
        }
      } catch (error) {
        const { logAudit } = await import("@/app/_server/actions/log");
        await logAudit({
          level: "DEBUG",
          action: "file_scan",
          category: "upload",
          success: false,
          errorMessage: `Directory doesn't exist: ${dirInfo.path}`,
        });
      }
    }

    allFiles.sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    return { success: true, data: allFiles };
  } catch (error) {
    console.error("Error getting files:", error);
    return { success: false, error: "Failed to get files" };
  }
};

export const deleteFile = async (formData: FormData) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const fileName = formData.get("fileName") as string;
    const fileType = formData.get("fileType") as "image" | "video" | "file";

    if (!fileName || !fileType) {
      return { success: false, error: "File name and type are required" };
    }

    const userDir = await getUserModeDir(Modes.NOTES);
    const targetDir = path.join(
      userDir,
      fileType === "image"
        ? "images"
        : fileType === "video"
        ? "videos"
        : "files"
    );
    const filePath = path.join(targetDir, fileName);

    await fs.unlink(filePath);
    return { success: true, data: null };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { success: false, error: "File not found" };
    }
    console.error("Error deleting file:", error);
    return { success: false, error: "Failed to delete file" };
  }
};
