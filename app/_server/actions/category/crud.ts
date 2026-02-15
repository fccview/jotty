"use server";

import { revalidatePath } from "next/cache";
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

export const createCategory = async (formData: FormData) => {
  try {
    const name = formData.get("name") as string;
    const parent = formData.get("parent") as string;
    const mode = formData.get("mode") as Modes;

    const userDir = await getUserModeDir(mode);
    const categoryPath = parent ? path.join(parent, name) : name;
    const categoryDir = path.join(userDir, categoryPath);
    await ensureDir(categoryDir);

    await logAudit({
      level: "INFO",
      action: "category_created",
      category: mode === Modes.NOTES ? "note" : "checklist",
      success: true,
      metadata: { categoryName: name, parentCategory: parent, mode },
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
    const oldCategoryDir = path.join(userDir, oldPath);

    const pathParts = oldPath.split("/");
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join("/");
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

    if (mode === Modes.NOTES) {
      try {
        const username = await getUsername();
        if (username) {
          const { commitNote } = await import("@/app/_server/actions/history");
          const { getUserNotes } = await import("@/app/_server/actions/note");

          const notesResult = await getUserNotes({ username, isRaw: true });
          if (notesResult.success && notesResult.data) {
            const notesInCategory = notesResult.data.filter((note) => {
              const category = note.category || "Uncategorized";
              return category === newPath || category.startsWith(`${newPath}/`);
            });

            for (const note of notesInCategory) {
              try {
                const oldCategory = (note.category || "Uncategorized").replace(
                  newPath,
                  oldPath,
                );
                const newCategory = note.category || "Uncategorized";
                const filePath = path.join(newCategoryDir, `${note.id}.md`);
                const fileContent = await fs.readFile(filePath, "utf-8");
                const titleMatch = fileContent.match(/^title:\s*(.+)$/m);
                const title = titleMatch ? titleMatch[1] : note.id!;

                await commitNote(
                  username,
                  path.join(newCategory, `${note.id}.md`),
                  "move",
                  title,
                  {
                    oldCategory,
                    newCategory,
                    oldPath: path.join(oldCategory, `${note.id}.md`),
                  },
                );
              } catch (error) {
                console.warn(
                  `Failed to commit git mv for note ${note.id}:`,
                  error,
                );
              }
            }
          }
        }
      } catch (error) {
        console.warn("Failed to commit category rename to git history:", error);
      }
    }

    await logAudit({
      level: "INFO",
      action: "category_renamed",
      category: mode === Modes.NOTES ? "note" : "checklist",
      success: true,
      metadata: { oldPath, newPath, newName, mode },
    });

    try {
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
