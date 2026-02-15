"use server";

import { revalidatePath } from "next/cache";
import path from "path";
import {
  serverWriteFile,
  ensureDir,
} from "@/app/_server/actions/file";
import {
  getAllLists,
  getUserChecklists,
} from "@/app/_server/actions/checklist";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { isAdmin, getUsername } from "@/app/_server/actions/users";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { broadcast } from "@/app/_server/ws/broadcast";

export const reorderItems = async (formData: FormData) => {
  try {
    const listId = formData.get("listId") as string;
    const activeItemId = formData.get("activeItemId") as string;
    const overItemId = formData.get("overItemId") as string;
    const category = formData.get("category") as string;
    const isDropInto = formData.get("isDropInto") === "true";
    const position = (formData.get("position") as string) || "before";

    const isAdminUser = await isAdmin();
    const lists = await (isAdminUser ? getAllLists() : getUserChecklists());
    if (!lists.success || !lists.data) {
      throw new Error(lists.error || "Failed to fetch lists");
    }

    const list = lists.data.find(
      (l) => l.id === listId && (!category || l.category === category)
    );
    if (!list) {
      throw new Error("List not found");
    }

    const findItemWithParent = (
      items: any[],
      targetId: string,
      parent: any = null
    ): { item: any; parent: any; siblings: any[]; index: number } | null => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.id === targetId) {
          return { item, parent, siblings: items, index: i };
        }
        if (item.children) {
          const found = findItemWithParent(item.children, targetId, item);
          if (found) return found;
        }
      }
      return null;
    };

    const cloneItems = (items: any[]): any[] => {
      return items.map((item) => ({
        ...item,
        children: item.children ? cloneItems(item.children) : undefined,
      }));
    };

    const isDescendantOf = (
      ancestorId: string,
      descendantId: string,
      items: any[]
    ): boolean => {
      const findItem = (items: any[], id: string): any | null => {
        for (const item of items) {
          if (item.id === id) return item;
          if (item.children) {
            const found = findItem(item.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      const checkDescendant = (item: any, targetId: string): boolean => {
        if (!item.children) return false;
        for (const child of item.children) {
          if (child.id === targetId) return true;
          if (checkDescendant(child, targetId)) return true;
        }
        return false;
      };

      const ancestor = findItem(items, ancestorId);
      return ancestor ? checkDescendant(ancestor, descendantId) : false;
    };

    if (isDescendantOf(activeItemId, overItemId, list.items || [])) {
      return { success: true };
    }

    const newItems = cloneItems(list.items || []);

    const activeInfo = findItemWithParent(newItems, activeItemId);
    const overInfo = findItemWithParent(newItems, overItemId);

    if (!activeInfo || !overInfo) {
      throw new Error("Item not found in hierarchy");
    }

    activeInfo.siblings.splice(activeInfo.index, 1);

    if (isDropInto) {
      if (!overInfo.item.children) {
        overInfo.item.children = [];
      }
      overInfo.item.children.push(activeInfo.item);
    } else {
      const targetSiblings = overInfo.siblings;
      let newIndex = targetSiblings.findIndex((item) => item.id === overItemId);
      if (position === "after") {
        newIndex = newIndex + 1;
      }
      targetSiblings.splice(newIndex, 0, activeInfo.item);
    }

    const updateOrder = (items: any[]) => {
      items.forEach((item, idx) => {
        item.order = idx;
        if (item.children) updateOrder(item.children);
      });
    };
    updateOrder(newItems);

    const updatedList = {
      ...list,
      items: newItems,
      updatedAt: new Date().toISOString(),
    };

    const ownerDir = path.join(
      process.cwd(),
      "data",
      CHECKLISTS_FOLDER,
      list.owner!
    );
    const categoryDir = path.join(ownerDir, list.category || "Uncategorized");
    await ensureDir(categoryDir);

    const filePath = path.join(categoryDir, `${listId}.md`);

    const markdownContent = listToMarkdown(updatedList as any);

    await serverWriteFile(filePath, markdownContent);

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${listId}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    await broadcast({ type: "checklist", action: "updated", entityId: listId, username: (await getUsername()) });

    await new Promise((resolve) => setTimeout(resolve, 100));

    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to reorder items" };
  }
};
