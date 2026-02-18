"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import path from "path";
import {
  ensureDir,
  serverDeleteDir,
  getUserModeDir,
} from "@/app/_server/actions/file";
import fs from "fs/promises";
import { Modes } from "@/app/_types/enums";
import { getUsername } from "@/app/_server/actions/users";
import { logAudit } from "@/app/_server/actions/log";
import { broadcast } from "@/app/_server/ws/broadcast";
import { isPathSafe } from "@/app/_utils/path-utils";

export const createCategory = async (formData: FormData) => {
  try {
    const name = formData.get("name") as string;
    const parent = formData.get("parent") as string;
    const mode = formData.get("mode") as Modes;

    const userDir = await getUserModeDir(mode);
    const categoryPath = parent ? path.join(parent, name) : name;

    if (!isPathSafe(userDir, categoryPath)) {
      await logAudit({
        level: "WARNING",
        action: "category_created",
        category: mode === Modes.NOTES ? "note" : "checklist",
        success: false,
        errorMessage: "Invalid category path",
        metadata: { categoryName: name, parentCategory: parent, mode },
      });
      return { error: "Invalid category path" };
    }

    const categoryDir = path.join(userDir, categoryPath);
    await ensureDir(categoryDir);

    await logAudit({
      level: "INFO",
      action: "category_created",
      category: mode === Modes.NOTES ? "note" : "checklist",
      success: true,
      metadata: { categoryName: name, parentCategory: parent, mode },
    });

    revalidateTag(mode === Modes.NOTES ? "layout-notes" : "layout-checklists", {
      expire: 0,
    });
    await broadcast({
      type: "category",
      action: "created",
      entityId: name,
      username: await getUsername(),
    });

    return { success: true, data: { name, count: 0 } };
  } catch (error) {
    const name = formData.get("name") as string;
    const mode = formData.get("mode") as Modes;
    await logAudit({
      level: "ERROR",
      action: "category_created",
      category: mode === Modes.NOTES ? "note" : "checklist",
      success: false,
      errorMessage: "Failed to create category",
      metadata: { categoryName: name },
    });
    return { error: "Failed to create category" };
  }
};

export const deleteCategory = async (formData: FormData) => {
  try {
    const categoryPath = formData.get("path") as string;
    const mode = formData.get("mode") as Modes;

    const userDir = await getUserModeDir(mode);

    if (!isPathSafe(userDir, categoryPath)) {
      await logAudit({
        level: "WARNING",
        action: "category_deleted",
        category: mode === Modes.NOTES ? "note" : "checklist",
        success: false,
        errorMessage: "Invalid category path",
        metadata: { categoryPath, mode },
      });
      return { error: "Invalid category path" };
    }

    const categoryDir = path.join(userDir, categoryPath);
    await serverDeleteDir(categoryDir);

    await logAudit({
      level: "INFO",
      action: "category_deleted",
      category: mode === Modes.NOTES ? "note" : "checklist",
      success: true,
      metadata: { categoryPath, mode },
    });

    try {
      revalidateTag(
        mode === Modes.NOTES ? "layout-notes" : "layout-checklists",
        { expire: 0 },
      );
      revalidatePath("/");
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error,
      );
    }

    await broadcast({
      type: "category",
      action: "deleted",
      entityId: categoryPath,
      username: await getUsername(),
    });

    return { success: true };
  } catch (error) {
    const categoryPath = formData.get("path") as string;
    const mode = formData.get("mode") as Modes;
    await logAudit({
      level: "ERROR",
      action: "category_deleted",
      category: mode === Modes.NOTES ? "note" : "checklist",
      success: false,
      errorMessage: "Failed to delete category",
      metadata: { categoryPath },
    });
    return { error: "Failed to delete category" };
  }
};

export const renameCategory = async (formData: FormData) => {
  try {
    const oldPath = formData.get("oldPath") as string;
    const newName = formData.get("newName") as string;
    const mode = formData.get("mode") as Modes;

    if (!oldPath || !newName) {
      await logAudit({
        level: "WARNING",
        action: "category_renamed",
        category: mode === Modes.NOTES ? "note" : "checklist",
        success: false,
        errorMessage: "Both old path and new name are required",
      });
      return { error: "Both old path and new name are required" };
    }

    const userDir = await getUserModeDir(mode);

    if (!isPathSafe(userDir, oldPath)) {
      await logAudit({
        level: "WARNING",
        action: "category_renamed",
        category: mode === Modes.NOTES ? "note" : "checklist",
        success: false,
        errorMessage: "Invalid old category path",
        metadata: { oldPath, newName, mode },
      });
      return { error: "Invalid category path" };
    }

    const oldCategoryDir = path.join(userDir, oldPath);

    const pathParts = oldPath.split("/");
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join("/");

    if (!isPathSafe(userDir, newPath)) {
      await logAudit({
        level: "WARNING",
        action: "category_renamed",
        category: mode === Modes.NOTES ? "note" : "checklist",
        success: false,
        errorMessage: "Invalid new category path",
        metadata: { oldPath, newName, newPath, mode },
      });
      return { error: "Invalid category path" };
    }

    const newCategoryDir = path.join(userDir, newPath);

    if (
      !(await fs
        .access(oldCategoryDir)
        .then(() => true)
        .catch(() => false))
    ) {
      await logAudit({
        level: "WARNING",
        action: "category_renamed",
        category: mode === Modes.NOTES ? "note" : "checklist",
        success: false,
        errorMessage: "Category not found",
        metadata: { oldPath },
      });
      return { error: "Category not found" };
    }

    if (
      await fs
        .access(newCategoryDir)
        .then(() => true)
        .catch(() => false)
    ) {
      await logAudit({
        level: "WARNING",
        action: "category_renamed",
        category: mode === Modes.NOTES ? "note" : "checklist",
        success: false,
        errorMessage: "Category with new name already exists",
        metadata: { oldPath, newName },
      });
      return { error: "Category with new name already exists" };
    }

    await fs.rename(oldCategoryDir, newCategoryDir);

    const username = await getUsername();
    if (mode === Modes.NOTES && username) {
      const { commitCategoryRename } =
        await import("@/app/_server/actions/history");
      await commitCategoryRename(username, oldPath, newPath);
    }

    await logAudit({
      level: "INFO",
      action: "category_renamed",
      category: mode === Modes.NOTES ? "note" : "checklist",
      success: true,
      metadata: { oldPath, newPath, newName, mode },
    });

    try {
      revalidateTag(
        mode === Modes.NOTES ? "layout-notes" : "layout-checklists",
        { expire: 0 },
      );
      revalidatePath("/");
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error,
      );
    }

    await broadcast({
      type: "category",
      action: "updated",
      entityId: newName,
      username: await getUsername(),
    });

    return { success: true };
  } catch (error) {
    const oldPath = formData.get("oldPath") as string;
    const mode = formData.get("mode") as Modes;
    await logAudit({
      level: "ERROR",
      action: "category_renamed",
      category: mode === Modes.NOTES ? "note" : "checklist",
      success: false,
      errorMessage: "Failed to rename category",
      metadata: { oldPath },
    });
    return { error: "Failed to rename category" };
  }
};
