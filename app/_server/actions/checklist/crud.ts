"use server";

import path from "path";
import { Checklist, Item, ChecklistType } from "@/app/_types";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { getCurrentUser } from "@/app/_server/actions/users";
import {
  getUserModeDir,
  ensureDir,
  serverWriteFile,
  serverDeleteFile,
} from "@/app/_server/actions/file";
import { revalidatePath } from "next/cache";
import { generateUniqueFilename, sanitizeFilename } from "@/app/_utils/filename-utils";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { buildCategoryPath, getFormData } from "@/app/_utils/global-utils";
import {
  updateIndexForItem,
  parseInternalLinks,
  removeItemFromIndex,
  rebuildLinkIndex,
} from "@/app/_server/actions/link";
import { checkUserPermission } from "@/app/_server/actions/sharing";
import { generateUuid, updateYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { logContentEvent } from "@/app/_server/actions/log";
import { getListById, getUserChecklists } from "./queries";

export const createList = async (formData: FormData) => {
  try {
    const title = formData.get("title") as string;
    const category = (formData.get("category") as string) || "Uncategorized";
    const type = (formData.get("type") as ChecklistType) || "simple";
    const userParam = formData.get("user") as string | null;

    let username: string | undefined;
    if (userParam) {
      try {
        const parsedUser = JSON.parse(userParam);
        username = parsedUser.username;
      } catch {
        username = undefined;
      }
    }

    const userDir = username
      ? path.join(process.cwd(), "data", CHECKLISTS_FOLDER, username)
      : await getUserModeDir(Modes.CHECKLISTS);
    const categoryDir = path.join(userDir, category);
    await ensureDir(categoryDir);

    const currentUser = await getCurrentUser();
    const fileRenameMode = currentUser?.fileRenameMode || "minimal";
    const filename = await generateUniqueFilename(
      categoryDir,
      title,
      ".md",
      fileRenameMode
    );
    const id = path.basename(filename, ".md");
    const filePath = path.join(categoryDir, filename);

    const newList: Checklist = {
      id,
      uuid: generateUuid(),
      title,
      type,
      category,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: username,
    };

    await serverWriteFile(filePath, listToMarkdown(newList));

    try {
      const content = newList.items.map((i) => i.text).join("\n");
      const links = await parseInternalLinks(content);
      const indexUsername = username || (await getCurrentUser())?.username;
      if (indexUsername) {
        await updateIndexForItem(
          indexUsername,
          ItemTypes.CHECKLIST,
          newList.uuid!,
          links
        );
      }
    } catch (error) {
      console.warn(
        "Failed to update link index for new checklist:",
        newList.id,
        error
      );
    }

    await logContentEvent(
      "checklist_created",
      "checklist",
      newList.uuid!,
      newList.title,
      true,
      { category: newList.category }
    );

    return { success: true, data: newList };
  } catch (error) {
    const { title, uuid } = getFormData(formData, ["title", "uuid"]);
    await logContentEvent(
      "checklist_created",
      "checklist",
      uuid!,
      title || "unknown",
      false
    );
    console.error("Error creating list:", error);
    return { error: "Failed to create list" };
  }
};

export const updateList = async (formData: FormData) => {
  try {
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;
    const originalCategory = formData.get("originalCategory") as string;
    const ownerUsername = formData.get("user") as string | null;
    const unarchive = formData.get("unarchive") as string;
    const apiUser = formData.get("apiUser") as string | null;

    let actingUser = await getCurrentUser();
    if (!actingUser && apiUser) {
      try {
        actingUser = JSON.parse(apiUser);
      } catch {
        return { error: "Invalid user data" };
      }
    }

    if (!actingUser || !actingUser.username) {
      return { error: "Not authenticated" };
    }

    const currentList = await getListById(
      id,
      ownerUsername || undefined,
      originalCategory,
      unarchive === "true"
    );

    if (!currentList) {
      throw new Error("List not found");
    }

    const canEdit = await checkUserPermission(
      id,
      originalCategory,
      ItemTypes.CHECKLIST,
      actingUser.username,
      PermissionTypes.EDIT
    );

    if (!canEdit) {
      return { error: "Permission denied" };
    }

    const updatedList: Checklist = {
      ...currentList,
      title,
      category: category || currentList.category,
      items: currentList.items,
      updatedAt: new Date().toISOString(),
    };

    const ownerDir = path.join(
      process.cwd(),
      "data",
      CHECKLISTS_FOLDER,
      currentList.owner!
    );
    const categoryDir = path.join(
      ownerDir,
      updatedList.category || "Uncategorized"
    );
    await ensureDir(categoryDir);

    let newFilename: string;
    let newId = id;

    const fileRenameMode = actingUser?.fileRenameMode || "minimal";
    const sanitizedTitle = sanitizeFilename(title, fileRenameMode);
    const currentFilename = `${id}.md`;
    const expectedFilename = `${sanitizedTitle}.md`;

    if (title !== currentList.title || currentFilename !== expectedFilename) {
      newFilename = await generateUniqueFilename(
        categoryDir,
        title,
        ".md",
        fileRenameMode
      );
      newId = path.basename(newFilename, ".md");
    } else {
      newFilename = `${id}.md`;
    }

    if (newId !== id) {
      updatedList.id = newId;
    }

    const filePath = path.join(categoryDir, newFilename);

    let oldFilePath: string | null = null;
    if (category && category !== currentList.category) {
      oldFilePath = path.join(
        ownerDir,
        currentList.category || "Uncategorized",
        `${id}.md`
      );
    } else if (newId !== id) {
      oldFilePath = path.join(
        ownerDir,
        currentList.category || "Uncategorized",
        `${id}.md`
      );
    }

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    try {
      const content = updatedList.items.map((i) => i.text).join("\n");
      const links = await parseInternalLinks(content);
      const newItemKey = `${updatedList.category || "Uncategorized"}/${
        updatedList.id
      }`;

      const oldItemKey = `${currentList.category || "Uncategorized"}/${id}`;
      if (oldItemKey !== newItemKey) {
        await rebuildLinkIndex(currentList.owner!);
        revalidatePath("/");
      }

      await updateIndexForItem(
        currentList.owner!,
        ItemTypes.CHECKLIST,
        updatedList.uuid!,
        links
      );
    } catch (error) {
      console.warn(
        "Failed to update link index for checklist:",
        updatedList.id,
        error
      );
    }

    if (newId !== id || (category && category !== currentList.category)) {
      const { updateSharingData } = await import(
        "@/app/_server/actions/sharing"
      );

      await updateSharingData(
        {
          id,
          category: currentList.category || "Uncategorized",
          itemType: ItemTypes.CHECKLIST,
          sharer: currentList.owner!,
        },
        {
          id: newId,
          category: updatedList.category || "Uncategorized",
          itemType: ItemTypes.CHECKLIST,
          sharer: currentList.owner!,
        }
      );
    }

    if (oldFilePath && oldFilePath !== filePath) {
      await serverDeleteFile(oldFilePath);
    }

    try {
      revalidatePath("/");
      const oldCategoryPath = buildCategoryPath(
        currentList.category || "UncategorCgorized",
        id
      );
      const newCategoryPath = buildCategoryPath(
        updatedList.category || "Uncategorized",
        newId !== id ? newId : id
      );

      revalidatePath(`/checklist/${oldCategoryPath}`);

      if (newId !== id || currentList.category !== updatedList.category) {
        revalidatePath(`/checklist/${newCategoryPath}`);
      }
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    await logContentEvent(
      "checklist_updated",
      "checklist",
      updatedList.uuid!,
      updatedList.title,
      true,
      { category: updatedList.category }
    );

    return { success: true, data: updatedList };
  } catch (error) {
    try {
      const { title, uuid } = getFormData(formData, ["title", "uuid"]);
      await logContentEvent(
        "checklist_updated",
        "checklist",
        uuid!,
        title || "unknown",
        false
      );
    } catch {}
    return { error: "Failed to update list" };
  }
};

export const deleteList = async (formData: FormData) => {
  try {
    const id = formData.get("id") as string;
    const category = (formData.get("category") as string) || "Uncategorized";
    const uuid = formData.get("uuid") as string | null;
    const apiUser = formData.get("apiUser") as string | null;
    const itemIdentifier = uuid || id;

    let currentUser = await getCurrentUser();
    if (!currentUser && apiUser) {
      try {
        currentUser = JSON.parse(apiUser);
      } catch {
        return { error: "Invalid user data" };
      }
    }

    if (!currentUser) {
      return { error: "Not authenticated" };
    }

    const list = await getListById(
      itemIdentifier,
      currentUser.username,
      category
    );

    if (!list) {
      return { error: "List not found" };
    }

    const canDelete = await checkUserPermission(
      itemIdentifier,
      category,
      ItemTypes.CHECKLIST,
      currentUser.username,
      PermissionTypes.DELETE
    );

    if (!canDelete) {
      return { error: "Permission denied" };
    }

    const ownerUsername = list.owner || currentUser.username;
    const ownerDir = path.join(
      process.cwd(),
      "data",
      CHECKLISTS_FOLDER,
      ownerUsername
    );
    const filePath = path.join(
      ownerDir,
      list.category || "Uncategorized",
      `${list.id}.md`
    );

    await serverDeleteFile(filePath);

    try {
      await removeItemFromIndex(list.owner!, ItemTypes.CHECKLIST, list.uuid!);
    } catch (error) {
      console.warn(
        "Failed to remove checklist from link index:",
        list.id,
        error
      );
    }

    if (list.owner) {
      const { updateSharingData } = await import(
        "@/app/_server/actions/sharing"
      );
      await updateSharingData(
        {
          id: list.id,
          category: list.category || "Uncategorized",
          itemType: ItemTypes.CHECKLIST,
          sharer: list.owner,
        },
        null
      );
    }

    try {
      revalidatePath("/");
      const categoryPath = buildCategoryPath(
        list.category || "Uncategorized",
        list.id
      );
      revalidatePath(`/checklist/${categoryPath}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }
    await logContentEvent(
      "checklist_deleted",
      "checklist",
      list.uuid || "unknown",
      list.title || "unknown",
      true,
      { category: list.category }
    );
    return { success: true };
  } catch (error) {
    try {
      const { title, uuid } = getFormData(formData, ["title", "uuid"]);
      await logContentEvent(
        "checklist_deleted",
        "checklist",
        uuid || "unknown",
        title || "unknown",
        false
      );
    } catch {}
    return { error: "Failed to delete list" };
  }
};

export const cloneChecklist = async (formData: FormData) => {
  try {
    const id = formData.get("id") as string;
    const originalCategory = formData.get("originalCategory") as string | null;
    const targetCategory = formData.get("category") as string;
    const ownerUsername = formData.get("user") as string | null;

    const checklist = await getListById(
      id,
      ownerUsername || undefined,
      originalCategory || undefined
    );
    if (!checklist) {
      return { error: "Checklist not found" };
    }

    const currentUser = await getCurrentUser();
    const userDir = await getUserModeDir(Modes.CHECKLISTS);

    const isOwnedByCurrentUser =
      !checklist.owner || checklist.owner === currentUser?.username;
    const finalTargetCategory = isOwnedByCurrentUser
      ? targetCategory || "Uncategorized"
      : "Uncategorized";

    const categoryDir = path.join(userDir, finalTargetCategory);
    await ensureDir(categoryDir);

    const cloneTitle = `${checklist.title} (Copy)`;
    const fileRenameMode = currentUser?.fileRenameMode || "minimal";
    const filename = await generateUniqueFilename(
      categoryDir,
      cloneTitle,
      ".md",
      fileRenameMode
    );
    const filePath = path.join(categoryDir, filename);

    const content = listToMarkdown(checklist);
    const updatedContent = updateYamlMetadata(content, {
      uuid: generateUuid(),
      title: cloneTitle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await serverWriteFile(filePath, updatedContent);

    const newId = path.basename(filename, ".md");
    const clonedChecklist = await getListById(
      newId,
      currentUser?.username,
      finalTargetCategory
    );

    try {
      revalidatePath("/");
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but checklist was cloned successfully:",
        error
      );
    }

    return { success: true, data: clonedChecklist };
  } catch (error) {
    console.error("Error cloning checklist:", error);
    return { error: "Failed to clone checklist" };
  }
};
