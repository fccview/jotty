"use server";

import { revalidatePath, revalidateTag } from "next/cache";
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
import { rebuildLinkIndexInternal } from "@/app/_server/actions/link";
import { logAudit } from "@/app/_server/actions/log";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { isPathSafe } from "@/app/_utils/path-utils";
import { ARCHIVED_DIR_NAME, EXCLUDED_DIRS } from "@/app/_consts/files";
import {
  catUuid,
  dirItemUuids,
  subCatUuids,
} from "@/app/_server/actions/share/category-info";
import { mountsFor, userDirFor } from "@/app/_server/actions/share/mounts";
import {
  invalidateCached,
  metaCacheKey,
} from "@/app/_server/actions/lib/metadata-cache";
import { targetDir, bouncer, shownAs } from "@/app/_server/actions/share/target";
import { SharedMount } from "@/app/_types/sharing";
import { PermissionTypes } from "@/app/_types/enums";
import { orderByUuids } from "@/app/_utils/order-utils";

const _seededOrder = async (
  dirPath: string,
  mountUuids: string[] = [],
  allowArchived: boolean = false,
): Promise<{ categories: string[]; items: string[] }> => {
  const excluded = allowArchived
    ? EXCLUDED_DIRS
    : [...EXCLUDED_DIRS, ARCHIVED_DIR_NAME];

  const [order, presentItems, presentCats] = await Promise.all([
    readOrderFile(dirPath),
    dirItemUuids(dirPath),
    subCatUuids(dirPath, excluded),
  ]);

  const identity = (uuid: string) => uuid;

  return {
    categories: orderByUuids(
      [...presentCats, ...mountUuids],
      order?.categories,
      identity,
    ),
    items: orderByUuids(presentItems, order?.items, identity),
  };
};

/**
 * Order lives in the owning user's .category-info.json, so a collaborator's
 * reorder has to evict the owner's cached listing too, otherwise the new order
 * only surfaces once some unrelated write happens to touch that tree.
 */
const forgetLists = (mode: Modes, owners: string[]): void => {
  Array.from(new Set(owners)).forEach((owner) => {
    const dir = path.join(process.cwd(), userDirFor(mode, owner));
    invalidateCached(metaCacheKey(mode, dir));
  });
};

const _dndValue = (dndId: string): string =>
  dndId ? dndId.split("::")[1] || "" : "";

const _findItemByUuid = async (
  baseDir: string,
  uuid: string,
): Promise<{ id: string; category: string } | null> => {
  if (!uuid) return null;

  const { grepFindFileByUuid } = await import("@/app/_utils/grep-utils");
  const absDir = path.isAbsolute(baseDir)
    ? baseDir
    : path.join(process.cwd(), baseDir);
  const found = await grepFindFileByUuid(absDir, uuid);

  return found ? { id: found.id, category: found.category } : null;
};

const _locateItem = async (
  mode: Modes,
  username: string,
  owners: string[],
  uuid: string,
): Promise<{ id: string; category: string } | null> => {
  for (const owner of owners) {
    const found = await _findItemByUuid(userDirFor(mode, owner), uuid);

    if (found) {
      return {
        id: found.id,
        category: await shownAs(mode, username, owner, found.category),
      };
    }
  }

  return null;
};

const _restamp = async (
  filePath: string,
  owner: string,
  category: string,
): Promise<void> => {
  try {
    const { updateYamlMetadata } = await import(
      "@/app/_utils/yaml-metadata-utils"
    );
    const content = await fs.readFile(filePath, "utf-8");

    await fs.writeFile(
      filePath,
      updateYamlMetadata(content, { owner, category }),
      "utf-8",
    );
  } catch (error) {
    console.error(`Failed to restamp ${filePath}:`, error);
  }
};

const _mountAt = (mounts: SharedMount[], category: string) =>
  mounts.find((mount) => mount.displayName === category);

const _reorderList = (
  list: string[],
  activeKey: string,
  targetKey: string,
  position: "before" | "after",
): string[] => {
  const result = [...list];
  if (!result.includes(activeKey)) result.push(activeKey);
  if (!result.includes(targetKey)) result.push(targetKey);

  result.splice(result.indexOf(activeKey), 1);

  const targetIdx = result.indexOf(targetKey);
  result.splice(position === "before" ? targetIdx : targetIdx + 1, 0, activeKey);

  return result;
};

const _insertInList = (
  list: string[],
  activeKey: string,
  targetKey: string | null,
  position: "before" | "after",
): string[] => {
  const result = list.filter((key) => key !== activeKey);

  if (targetKey) {
    const targetIdx = result.indexOf(targetKey);
    if (targetIdx !== -1) {
      result.splice(
        position === "before" ? targetIdx : targetIdx + 1,
        0,
        activeKey,
      );
      return result;
    }
  }

  result.push(activeKey);
  return result;
};

export const moveNode = async (formData: FormData) => {
  try {
    const mode = formData.get("mode") as Modes;
    const baseDir = await getUserModeDir(mode);
    const activeType = formData.get("activeType") as "item" | "category";
    const overType = formData.get("overType") as "drop-indicator" | "category";

    const username = await getUsername();

    if (!username) {
      return { error: "Not authenticated" };
    }

    const mounts = await mountsFor(mode, username);
    const mountUuids = mounts.map((mount) => mount.categoryUuid);

    let activeName: string;
    let activeParentPath: string;
    let activeKey: string;

    if (activeType === "item") {
      const activeUuid = formData.get("activeUuid") as string;
      const owners = [username, ...mounts.map((mount) => mount.owner)];
      const found = await _locateItem(mode, username, owners, activeUuid);

      if (!found) {
        return { error: "Item not found" };
      }

      activeName = found.id;
      activeParentPath = found.category;
      activeKey = activeUuid;
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

      const activeMount = _mountAt(mounts, catPath);

      if (activeMount) {
        activeKey = activeMount.categoryUuid;
      } else {
        const location = await targetDir(mode, username, catPath);
        activeKey = await catUuid(location.dir);
      }
    }

    let destParentPath: string;
    let targetKey: string | null = null;
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
          const extracted = _dndValue(targetDndId);

          if (targetType === "item") {
            targetKey = extracted || null;
          } else if (extracted && isPathSafe(baseDir, extracted)) {
            const targetMount = _mountAt(mounts, extracted);
            targetKey = targetMount
              ? targetMount.categoryUuid
              : await catUuid((await targetDir(mode, username, extracted)).dir);
          }
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

    const activeMountRoot =
      activeType === "category"
        ? _mountAt(mounts, formData.get("activeCategoryPath") as string)
        : undefined;

    if (activeMountRoot && destParentPath) {
      return { error: "Shared folders stay at the top level" };
    }

    const isSameParent = activeParentPath === destParentPath;

    if (isSameParent && overType === "category") {
      return { success: true };
    }

    const sourceLoc = await targetDir(mode, username, activeParentPath);
    const destLoc = await targetDir(mode, username, destParentPath);

    if (activeType === "category" && sourceLoc.owner !== destLoc.owner) {
      return { error: "Cannot move a folder between owners" };
    }

    const entry = await bouncer(
      destLoc,
      username,
      isSameParent ? PermissionTypes.EDIT : PermissionTypes.CREATE,
    );

    if (!entry.allowed) {
      return { error: entry.error };
    }

    if (!isSameParent) {
      const exit = await bouncer(sourceLoc, username, PermissionTypes.DELETE);

      if (!exit.allowed) {
        return { error: exit.error };
      }
    }

    const oldParentDir = sourceLoc.dir;
    const newParentDir = destLoc.dir;
    const listKey = activeType === "item" ? "items" : "categories";
    const rootUuids = activeParentPath ? [] : mountUuids;

    if (isSameParent) {
      const order = await _seededOrder(oldParentDir, rootUuids);
      const list = order[listKey];

      if (targetKey && targetKey !== activeKey) {
        order[listKey] = _reorderList(
          list,
          activeKey,
          targetKey,
          targetPosition,
        );
      } else if (crossTypeTarget) {
        const filtered = list.filter((key) => key !== activeKey);
        order[listKey] =
          activeType === "item"
            ? [activeKey, ...filtered]
            : [...filtered, activeKey];
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

      if (activeType === "item") {
        await _restamp(newPath, destLoc.owner, destLoc.category);
      }

      const oldOrder = await _seededOrder(oldParentDir, rootUuids);
      oldOrder[listKey] = oldOrder[listKey].filter((key) => key !== activeKey);

      const newOrder = await _seededOrder(
        newParentDir,
        destParentPath ? [] : mountUuids,
      );
      newOrder[listKey] = _insertInList(
        newOrder[listKey],
        activeKey,
        targetKey,
        targetPosition,
      );

      await writeOrderFile(oldParentDir, oldOrder);
      await writeOrderFile(newParentDir, newOrder);

      if (activeType === "item" && mode === Modes.NOTES) {
        try {
          const { commitNote } = await import("@/app/_server/actions/history");
          const fileContent = await fs.readFile(newPath, "utf-8");
          const titleMatch = fileContent.match(/^title:\s*(.+)$/m);
          const title = titleMatch ? titleMatch[1] : activeName;

          await commitNote(
            destLoc.owner,
            path.join(destLoc.category || "Uncategorized", `${activeName}.md`),
            "move",
            title,
            {
              oldCategory: sourceLoc.category || "Uncategorized",
              newCategory: destLoc.category || "Uncategorized",
              oldPath: path.join(
                sourceLoc.category || "Uncategorized",
                `${activeName}.md`,
              ),
            },
          );
        } catch (error) {
          console.warn("Failed to commit note move to git history:", error);
        }
      }

      try {
        await rebuildLinkIndexInternal(sourceLoc.owner);

        if (destLoc.owner !== sourceLoc.owner) {
          await rebuildLinkIndexInternal(destLoc.owner);
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

    forgetLists(mode, [sourceLoc.owner, destLoc.owner]);

    revalidateTag(mode === Modes.NOTES ? "layout-notes" : "layout-checklists", { expire: 0 });
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
