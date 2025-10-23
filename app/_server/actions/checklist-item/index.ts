"use server";

import { revalidatePath } from "next/cache";
import path from "path";
import {
  getUserModeDir,
  serverWriteFile,
  ensureDir,
} from "@/app/_server/actions/file";
import { getLists, getAllLists } from "@/app/_server/actions/checklist";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { isAdmin } from "@/app/_server/actions/users";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { Checklist } from "@/app/_types";
import { Modes, TaskStatus } from "@/app/_types/enums";

export const updateItem = async (
  formData: FormData,
  username?: string,
  skipRevalidation = false
) => {
  try {
    const listId = formData.get("listId") as string;
    const itemId = formData.get("itemId") as string;
    const completed = formData.get("completed") === "true";
    const text = formData.get("text") as string;
    const category = formData.get("category") as string;

    const isAdminUser = await isAdmin();
    const lists = await (isAdminUser ? getAllLists() : getLists(username));
    if (!lists.success || !lists.data) {
      throw new Error(lists.error || "Failed to fetch lists");
    }

    const list = lists.data.find(
      (l) => l.id === listId && (!category || l.category === category)
    );
    if (!list) {
      throw new Error("List not found");
    }

    if (username && list.owner !== username && !isAdminUser) {
      throw new Error("List not found");
    }

    const updatedList = {
      ...list,
      items: list.items.map((item) =>
        item.id === itemId
          ? { ...item, completed, ...(text && { text }) }
          : item
      ),
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

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    if (!skipRevalidation) {
      try {
        revalidatePath("/");
        revalidatePath(`/checklist/${listId}`);
      } catch (error) {
        console.warn(
          "Cache revalidation failed, but data was saved successfully:",
          error
        );
      }
    }

    return { success: true, data: updatedList };
  } catch (error) {
    console.error(
      "Error updating item:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    console.error(
      "Error updating item:",
      error instanceof Error ? error.message : String(error)
    );
    return { error: "Failed to update item" };
  }
};

export const createItem = async (
  formData: FormData,
  username?: string,
  skipRevalidation = false
) => {
  try {
    const listId = formData.get("listId") as string;
    const text = formData.get("text") as string;
    const status = formData.get("status") as string;
    const timeStr = formData.get("time") as string;
    const category = formData.get("category") as string;

    const isAdminUser = await isAdmin();
    const lists = await (isAdminUser ? getAllLists() : getLists(username));
    if (!lists.success || !lists.data) {
      throw new Error(lists.error || "Failed to fetch lists");
    }

    const list = lists.data.find(
      (l) => l.id === listId && (!category || l.category === category)
    );
    if (!list) {
      throw new Error("List not found");
    }

    if (username && list.owner !== username && !isAdminUser) {
      throw new Error("List not found");
    }

    let timeEntries: any[] = [];
    if (timeStr && timeStr !== "0") {
      try {
        timeEntries = JSON.parse(timeStr);
      } catch (e) {
        console.error("Failed to parse time entries:", e);
        timeEntries = [];
      }
    }

    const newItem = {
      id: `${listId}-${Date.now()}`,
      text,
      completed: false,
      order: list.items.length,
      ...(list.type === "task" && {
        status: (status as TaskStatus) || TaskStatus.TODO,
        timeEntries,
      }),
    };

    const updatedList = {
      ...list,
      items: [...list.items, newItem],
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

    await serverWriteFile(filePath, listToMarkdown(updatedList as Checklist));

    if (!skipRevalidation) {
      try {
        revalidatePath("/");
        revalidatePath(`/checklist/${listId}`);
      } catch (error) {
        console.warn(
          "Cache revalidation failed, but data was saved successfully:",
          error
        );
      }
    }

    return { success: true, data: newItem };
  } catch (error) {
    console.error(
      "Error creating item:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return { error: "Failed to create item" };
  }
};

export const deleteItem = async (formData: FormData) => {
  try {
    const listId = formData.get("listId") as string;
    const itemId = formData.get("itemId") as string;
    const category = formData.get("category") as string;

    const lists = await getLists();
    if (!lists.success || !lists.data) {
      throw new Error(lists.error || "Failed to fetch lists");
    }

    const list = lists.data.find(
      (l) => l.id === listId && (!category || l.category === category)
    );
    if (!list) {
      throw new Error("List not found");
    }

    const itemExists = list.items.some((item) => item.id === itemId);
    if (!itemExists) {
      return { success: true };
    }

    const updatedList = {
      ...list,
      items: list.items.filter((item) => item.id !== itemId),
      updatedAt: new Date().toISOString(),
    };

    let filePath: string;

    if (list.isShared) {
      const ownerDir = path.join(
        process.cwd(),
        "data",
        CHECKLISTS_FOLDER,
        list.owner!
      );
      filePath = path.join(
        ownerDir,
        list.category || "Uncategorized",
        `${listId}.md`
      );
    } else {
      const userDir = await getUserModeDir(Modes.CHECKLISTS);
      filePath = path.join(
        userDir,
        list.category || "Uncategorized",
        `${listId}.md`
      );
    }

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${listId}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    return { success: true };
  } catch (error) {
    return { error: "Failed to delete item" };
  }
};

export const reorderItems = async (formData: FormData) => {
  try {
    const listId = formData.get("listId") as string;
    const itemIds = JSON.parse(formData.get("itemIds") as string) as string[];
    const currentItems = JSON.parse(
      formData.get("currentItems") as string
    ) as any[];
    const category = formData.get("category") as string;

    const isAdminUser = await isAdmin();
    const lists = await (isAdminUser ? getAllLists() : getLists());
    if (!lists.success || !lists.data) {
      throw new Error(lists.error || "Failed to fetch lists");
    }

    const list = lists.data.find(
      (l) => l.id === listId && (!category || l.category === category)
    );
    if (!list) {
      throw new Error("List not found");
    }

    const itemMap = new Map(currentItems.map((item) => [item.id, item]));

    const updatedItems = itemIds.map((id, index) => {
      const item = itemMap.get(id);
      if (!item) throw new Error(`Item ${id} not found`);
      return { ...item, order: index };
    });

    const updatedList = {
      ...list,
      items: updatedItems,
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

    const markdownContent = listToMarkdown(updatedList);

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

    await new Promise((resolve) => setTimeout(resolve, 100));

    return { success: true };
  } catch (error) {
    return { error: "Failed to reorder items" };
  }
};

export const updateItemStatus = async (formData: FormData) => {
  try {
    const listId = formData.get("listId") as string;
    const itemId = formData.get("itemId") as string;
    const status = formData.get("status") as TaskStatus;
    const timeEntriesStr = formData.get("timeEntries") as string;
    const category = formData.get("category") as string;

    if (!listId || !itemId) {
      return { error: "List ID and item ID are required" };
    }

    if (!status && !timeEntriesStr) {
      return { error: "Either status or timeEntries must be provided" };
    }

    const isAdminUser = await isAdmin();
    const lists = await (isAdminUser ? getAllLists() : getLists());
    if (!lists.success || !lists.data) {
      throw new Error(lists.error || "Failed to fetch lists");
    }

    const list = lists.data.find(
      (l) => l.id === listId && (!category || l.category === category)
    );
    if (!list) {
      throw new Error("List not found");
    }

    const updatedList = {
      ...list,
      items: list.items.map((item) => {
        if (item.id === itemId) {
          const updates: any = {};
          if (status) updates.status = status;
          if (timeEntriesStr) {
            try {
              updates.timeEntries = JSON.parse(timeEntriesStr);
            } catch (e) {
              console.error("Failed to parse timeEntries:", e);
            }
          }
          return { ...item, ...updates };
        }
        return item;
      }),
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

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${listId}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error updating item status:", error);
    return { error: "Failed to update item status" };
  }
};

export const createBulkItems = async (formData: FormData) => {
  try {
    const listId = formData.get("listId") as string;
    const itemsText = formData.get("itemsText") as string;
    const category = formData.get("category") as string;

    const lists = await getLists();
    if (!lists.success || !lists.data) {
      throw new Error(lists.error || "Failed to fetch lists");
    }

    const list = lists.data.find(
      (l) => l.id === listId && (!category || l.category === category)
    );
    if (!list) {
      throw new Error("List not found");
    }

    const lines = itemsText.split("\n").filter((line) => line.trim());
    const newItems = lines.map((text, index) => ({
      id: `${listId}-${Date.now()}-${index}`,
      text: text.trim(),
      completed: false,
      order: list.items.length + index,
      ...(list.type === "task" && {
        status: TaskStatus.TODO,
        timeEntries: [],
      }),
    }));

    const updatedList = {
      ...list,
      items: [...list.items, ...newItems],
      updatedAt: new Date().toISOString(),
    };

    let filePath: string;

    if (list.isShared) {
      const ownerDir = path.join(
        process.cwd(),
        "data",
        CHECKLISTS_FOLDER,
        list.owner!
      );
      filePath = path.join(
        ownerDir,
        list.category || "Uncategorized",
        `${listId}.md`
      );
    } else {
      const userDir = await getUserModeDir(Modes.CHECKLISTS);
      filePath = path.join(
        userDir,
        list.category || "Uncategorized",
        `${listId}.md`
      );
    }

    await serverWriteFile(filePath, listToMarkdown(updatedList as Checklist));

    try {
      revalidatePath("/");
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    return { success: true, data: updatedList };
  } catch (error) {
    return { error: "Failed to create bulk items" };
  }
};

export const bulkToggleItems = async (formData: FormData) => {
  try {
    const listId = formData.get("listId") as string;
    const completed = formData.get("completed") === "true";
    const itemIdsStr = formData.get("itemIds") as string;
    const category = formData.get("category") as string;

    if (!listId || !itemIdsStr) {
      return { error: "List ID and item IDs are required" };
    }

    const itemIds = JSON.parse(itemIdsStr);

    const lists = await getLists();
    if (!lists.success || !lists.data) {
      throw new Error(lists.error || "Failed to fetch lists");
    }

    const list = lists.data.find(
      (l) => l.id === listId && (!category || l.category === category)
    );
    if (!list) {
      throw new Error("List not found");
    }

    const updatedList = {
      ...list,
      items: list.items.map((item) =>
        itemIds.includes(item.id) ? { ...item, completed } : item
      ),
      updatedAt: new Date().toISOString(),
    };

    let filePath: string;

    if (list.isShared) {
      const ownerDir = path.join(
        process.cwd(),
        "data",
        CHECKLISTS_FOLDER,
        list.owner!
      );
      filePath = path.join(
        ownerDir,
        list.category || "Uncategorized",
        `${listId}.md`
      );
    } else {
      const userDir = await getUserModeDir(Modes.CHECKLISTS);
      filePath = path.join(
        userDir,
        list.category || "Uncategorized",
        `${listId}.md`
      );
    }

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    try {
      revalidatePath("/");
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error bulk toggling items:", error);
    return { error: "Failed to bulk toggle items" };
  }
};

export const bulkDeleteItems = async (formData: FormData) => {
  try {
    const listId = formData.get("listId") as string;
    const itemIdsStr = formData.get("itemIds") as string;
    const itemIdsToDelete = JSON.parse(itemIdsStr) as string[];
    const category = formData.get("category") as string;

    if (!listId || !itemIdsToDelete || itemIdsToDelete.length === 0) {
      return { success: true };
    }

    const lists = await getLists();
    if (!lists.success || !lists.data) {
      throw new Error(lists.error || "Failed to fetch lists");
    }

    const list = lists.data.find(
      (l) => l.id === listId && (!category || l.category === category)
    );
    if (!list) {
      throw new Error("List not found");
    }

    const itemIdsSet = new Set(itemIdsToDelete);
    const updatedList = {
      ...list,
      items: list.items.filter((item) => !itemIdsSet.has(item.id)),
      updatedAt: new Date().toISOString(),
    };

    let filePath: string;
    if (list.isShared) {
      const ownerDir = path.join(
        process.cwd(),
        "data",
        CHECKLISTS_FOLDER,
        list.owner!
      );
      filePath = path.join(
        ownerDir,
        list.category || "Uncategorized",
        `${listId}.md`
      );
    } else {
      const userDir = await getUserModeDir(Modes.CHECKLISTS);
      filePath = path.join(
        userDir,
        list.category || "Uncategorized",
        `${listId}.md`
      );
    }

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${listId}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error during bulk delete:", error);
    return { error: "Failed to bulk delete items" };
  }
};
