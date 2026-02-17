"use server";

import { revalidatePath } from "next/cache";
import path from "path";
import {
  ensureDir,
  getUserModeDir,
  readOrderFile,
  writeOrderFile,
} from "@/app/_server/actions/file";
import fs from "fs/promises";
import { Modes } from "@/app/_types/enums";
import { getUsername } from "@/app/_server/actions/users";
import { rebuildLinkIndex } from "@/app/_server/actions/link";
import { logAudit } from "@/app/_server/actions/log";
import { broadcast } from "@/app/_server/ws/broadcast";
import { isPathSafe } from "@/app/_utils/path-utils";

const _sanitisedFileOrder = async (
  dirPath: string,
): Promise<{ categories: string[]; items: string[] }> => {
  const order = await readOrderFile(dirPath);
  return {
    categories: order?.categories || [],
    items: order?.items || [],
  };
};

const _nameExtraction = (
  dndId: string,
  type: "item" | "category",
): string => {
  if (!dndId) return "";
  const parts = dndId.split("::");
  if (type === "item") return parts[2] || "";
  if (type === "category") return (parts[1] || "").split("/").pop() || "";
  return "";
};

const _reorderList = (
  list: string[],
  activeName: string,
  targetName: string,
  position: "before" | "after",
): string[] => {
  const result = [...list];
  if (!result.includes(activeName)) result.push(activeName);
  if (!result.includes(targetName)) result.push(targetName);

  const fromIdx = result.indexOf(activeName);
  result.splice(fromIdx, 1);

  const targetIdx = result.indexOf(targetName);
  result.splice(
    position === "before" ? targetIdx : targetIdx + 1,
    0,
    activeName,
  );
  return result;
};

const _insertInList = (
  list: string[],
  activeName: string,
  targetName: string | null,
  position: "before" | "after",
): string[] => {
  const result = list.filter((n) => n !== activeName);
  if (targetName) {
    const targetIdx = result.indexOf(targetName);
    if (targetIdx !== -1) {
      result.splice(
        position === "before" ? targetIdx : targetIdx + 1,
        0,
        activeName,
      );
      return result;
    }
  }
  result.push(activeName);
  return result;
};

export const moveNode = async (formData: FormData) => {
  try {
    const mode = formData.get("mode") as Modes;
    const baseDir = await getUserModeDir(mode);
    const activeType = formData.get("activeType") as "item" | "category";
    const overType = formData.get("overType") as "drop-indicator" | "category";

    let activeName: string;
    let activeParentPath: string;

    if (activeType === "item") {
      activeName = formData.get("activeId") as string;
      activeParentPath = formData.get("activeItemCategory") as string;
    } else {
      const catPath = formData.get("activeCategoryPath") as string;
      
      if (catPath && !isPathSafe(baseDir, catPath)) {
        await logAudit({
          level: "WARNING",
          action: "category_moved",
          category: mode === Modes.NOTES ? "note" : "checklist",
          success: false,
          errorMessage: "Invalid active category path",
          metadata: { activeCategoryPath: catPath, mode },
        });
        return { error: "Invalid category path" };
      }
      
      activeName = catPath.split("/").pop()!;
      activeParentPath = catPath.includes("/")
        ? catPath.substring(0, catPath.lastIndexOf("/"))
        : "";
    }

    let destParentPath: string;
    let targetName: string | null = null;
    let targetPosition: "before" | "after" = "after";
    let crossTypeTarget = false;

    if (overType === "category") {
      destParentPath = formData.get("targetCategoryPath") as string;
    } else {
      destParentPath = (formData.get("targetParentPath") as string) || "";
      targetPosition = formData.get("targetPosition") as "before" | "after";
      const targetDndId = formData.get("targetDndId") as string;
      const targetType = formData.get("targetType") as "item" | "category";

      if (targetDndId) {
        if (targetType === activeType) {
          targetName = _nameExtraction(targetDndId, targetType);
        } else {
          crossTypeTarget = true;
        }
      }
    }

    if (activeType === "item" && !destParentPath) {
      destParentPath = "Uncategorized";
    }

    if (destParentPath && !isPathSafe(baseDir, destParentPath)) {
      await logAudit({
        level: "WARNING",
        action: "category_moved",
        category: mode === Modes.NOTES ? "note" : "checklist",
        success: false,
        errorMessage: "Invalid destination category path",
        metadata: { destParentPath, mode },
      });
      return { error: "Invalid category path" };
    }

    if (activeParentPath && !isPathSafe(baseDir, activeParentPath)) {
      await logAudit({
        level: "WARNING",
        action: "category_moved",
        category: mode === Modes.NOTES ? "note" : "checklist",
        success: false,
        errorMessage: "Invalid active parent category path",
        metadata: { activeParentPath, mode },
      });
      return { error: "Invalid category path" };
    }

    if (activeType === "category") {
      const activeCatPath = formData.get("activeCategoryPath") as string;
      if (overType === "category" && activeCatPath === destParentPath) {
        return { success: true };
      }
      if (
        destParentPath === activeCatPath ||
        destParentPath.startsWith(`${activeCatPath}/`)
      ) {
        return { error: "Cannot move a category into itself" };
      }
    }

    const isSameParent = activeParentPath === destParentPath;

    if (isSameParent && overType === "category") {
      return { success: true };
    }

    const oldParentDir = activeParentPath
      ? path.join(baseDir, activeParentPath)
      : baseDir;
    const newParentDir = destParentPath
      ? path.join(baseDir, destParentPath)
      : baseDir;
    const listKey = activeType === "item" ? "items" : "categories";

    if (isSameParent) {
      const order = await _sanitisedFileOrder(oldParentDir);
      const list = order[listKey];

      if (targetName && targetName !== activeName) {
        order[listKey] = _reorderList(
          list,
          activeName,
          targetName,
          targetPosition,
        );
      } else if (crossTypeTarget) {
        const filtered = list.filter((n) => n !== activeName);
        order[listKey] =
          activeType === "item"
            ? [activeName, ...filtered]
            : [...filtered, activeName];
      } else {
        return { success: true };
      }

      await writeOrderFile(oldParentDir, order);
    } else {
      await ensureDir(newParentDir);

      const fileName = activeType === "item" ? `${activeName}.md` : activeName;
      const oldPath = path.join(oldParentDir, fileName);
      const newPath = path.join(newParentDir, fileName);

      await fs.rename(oldPath, newPath);

      const oldOrder = await _sanitisedFileOrder(oldParentDir);
      oldOrder[listKey] = oldOrder[listKey].filter((n) => n !== activeName);

      const newOrder = await _sanitisedFileOrder(newParentDir);
      newOrder[listKey] = _insertInList(
        newOrder[listKey],
        activeName,
        targetName,
        targetPosition,
      );

      await writeOrderFile(oldParentDir, oldOrder);
      await writeOrderFile(newParentDir, newOrder);

      if (activeType === "item" && mode === Modes.NOTES) {
        try {
          const username = await getUsername();
          if (username) {
            const { commitNote } =
              await import("@/app/_server/actions/history");
            const fileContent = await fs.readFile(newPath, "utf-8");
            const titleMatch = fileContent.match(/^title:\s*(.+)$/m);
            const title = titleMatch ? titleMatch[1] : activeName;

            await commitNote(
              username,
              path.join(destParentPath || "Uncategorized", `${activeName}.md`),
              "move",
              title,
              {
                oldCategory: activeParentPath || "Uncategorized",
                newCategory: destParentPath || "Uncategorized",
                oldPath: path.join(
                  activeParentPath || "Uncategorized",
                  `${activeName}.md`,
                ),
              },
            );
          }
        } catch (error) {
          console.warn("Failed to commit note move to git history:", error);
        }
      }

      try {
        const username = await getUsername();
        if (username) {
          await rebuildLinkIndex(username);
        }
      } catch (error) {
        console.warn("Failed to update link index:", error);
      }
    }

    await logAudit({
      level: "INFO",
      action: "category_moved",
      category: mode === Modes.NOTES ? "note" : "checklist",
      success: true,
      metadata: {
        activeType,
        activeName,
        oldParent: activeParentPath,
        newParent: destParentPath,
        mode,
      },
    });

    revalidatePath("/");

    await broadcast({
      type: "category",
      action: "updated",
      username: await getUsername(),
    });

    return { success: true };
  } catch (error: any) {
    const mode = formData.get("mode") as Modes;
    const activeType = formData.get("activeType") as "item" | "category";
    await logAudit({
      level: "ERROR",
      action: "category_moved",
      category: mode === Modes.NOTES ? "note" : "checklist",
      success: false,
      errorMessage: `Failed to move node: ${error.message}`,
      metadata: { activeType },
    });
    return { error: `Failed to move node: ${error.message}` };
  }
};
