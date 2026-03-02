"use server";

import path from "path";
import fs from "fs/promises";
import { Result } from "@/app/_types";
import { getCurrentUser } from "../users";

export const uploadAppIcon = async (
  formData: FormData
): Promise<Result<{ url: string; filename: string }>> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.isAdmin) {
      return { success: false, error: "Unauthorized: Admin access required" };
    }

    if (!currentUser?.isSuperAdmin) {
      return { success: false, error: "Unauthorized: Only the system owner can upload app icons" };
    }

    const file = formData.get("file") as File;
    const iconType = formData.get("iconType") as string;

    if (!file) {
      return { success: false, error: "No file provided" };
    }

    if (!file.type.startsWith("image/")) {
      return { success: false, error: "File must be an image" };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "File size must be less than 5MB" };
    }

    const uploadsDir = path.join(process.cwd(), "data", "uploads", "app-icons");
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const extension = path.extname(file.name) || ".png";
    const filename = `${iconType}-${timestamp}${extension}`;
    const filepath = path.join(uploadsDir, filename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await fs.writeFile(filepath, buffer);

    const publicUrl = `/api/app-icons/${filename}`;

    return {
      success: true,
      data: { url: publicUrl, filename },
    };
  } catch (error) {
    console.error("Error uploading app icon:", error);
    return { success: false, error: "Failed to upload icon" };
  }
};
