"use server";

import path from "path";
import fs from "fs/promises";
import { Checklist, ChecklistType } from "@/app/_types";
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
import {
  generateUniqueFilename,
  sanitizeFilename,
} from "@/app/_utils/filename-utils";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { getFormData } from "@/app/_utils/global-utils";
import {
  updateIndexForItem,
  parseInternalLinks,
  removeItemFromIndex,
  rebuildLinkIndex,
} from "@/app/_server/actions/link";
import { checkUserPermission } from "@/app/_server/actions/sharing";
import {
  generateUuid,
  updateYamlMetadata,
} from "@/app/_utils/yaml-metadata-utils";
import { logContentEvent } from "@/app/_server/actions/log";
import { getListById } from "./queries";
import { broadcast } from "@/app/_server/ws/broadcast";

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
      fileRenameMode,
    );
    const slug = path.basename(filename, ".md");
    const filePath = path.join(categoryDir, filename);

    const newList: Checklist = {
      slug,
      uuid: generateUuid(),
      title,
      type,
      category,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: username || currentUser?.username,
    };

    await serverWriteFile(filePath, listToMarkdown(newList));

    try {
      const content = newList.items.map((i) => i.text).join("\n");
      const links = await parseInternalLinks(content);
      const indexUsername = newList.owner;
      if (indexUsername) {
        await updateIndexForItem(
          indexUsername,
          ItemTypes.CHECKLIST,
          newList.uuid,
          links,
        );
      }
    } catch (error) {
      console.warn(
        "Failed to update link index for new checklist:",
        newList.uuid,
        error,
      );
    }

    await logContentEvent(
      "checklist_created",
      "checklist",
      newList.uuid,
      newList.title,
      true,
      { category: newList.category },
    );

    await broadcast({
      type: "checklist",
      action: "created",
      entityId: newList.uuid,
      username: currentUser?.username || "",
    });

    return { success: true, data: newList };
  } catch (error) {
    const { title, uuid } = getFormData(formData, ["title", "uuid"]);
    await logContentEvent(
      "checklist_created",
      "checklist",
      uuid!,
      title || "unknown",
      false,
    );
    console.error("Error creating list:", error);
    return { error: "Failed to create list" };
  }
};

export const updateList = async (formData: FormData) => {
  try {
    const uuid = formData.get("uuid") as string;
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;
    const unarchive = formData.get("unarchive") as string;
    const apiUser = formData.get("apiUser") as string | null;

    if (!uuid) return { error: "UUID is required" };

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
      uuid,
      undefined,
      actingUser.username,
      unarchive === "true",
    );

    if (!currentList) {
      throw new Error("List not found");
    }

    const canEdit = await checkUserPermission(
      currentList.uuid,
      ItemTypes.CHECKLIST,
      actingUser.username,
      PermissionTypes.EDIT,
      currentList.owner,
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
      currentList.owner!,
    );
    const categoryDir = path.join(
      ownerDir,
      updatedList.category || "Uncategorized",
    );
    await ensureDir(categoryDir);

    const fileRenameMode = actingUser?.fileRenameMode || "minimal";
    const sanitizedTitle = sanitizeFilename(title, fileRenameMode);
    const currentFilename = `${currentList.slug}.md`;
    const expectedFilename = `${sanitizedTitle}.md`;

    let newFilename = currentFilename;
    let newSlug = currentList.slug;

    if (title !== currentList.title || currentFilename !== expectedFilename) {
      newFilename = await generateUniqueFilename(
        categoryDir,
        title,
        ".md",
        fileRenameMode,
      );
      newSlug = path.basename(newFilename, ".md");
    }

    updatedList.slug = newSlug;

    const filePath = path.join(categoryDir, newFilename);
    const movedCategory =
      !!category && category !== currentList.category;
    const renamedSlug = newSlug !== currentList.slug;

    let oldFilePath: string | null = null;
    if (movedCategory) {
      oldFilePath = path.join(
        ownerDir,
        currentList.category || "Uncategorized",
        `${currentList.slug}.md`,
      );
    } else if (renamedSlug) {
      oldFilePath = path.join(
        ownerDir,
        currentList.category || "Uncategorized",
        `${currentList.slug}.md`,
      );
    }

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    try {
      const content = updatedList.items.map((i) => i.text).join("\n");
      const links = await parseInternalLinks(content);

      if (movedCategory || renamedSlug) {
        await rebuildLinkIndex(currentList.owner!);
        revalidatePath("/");
      }

      await updateIndexForItem(
        currentList.owner!,
        ItemTypes.CHECKLIST,
        updatedList.uuid,
        links,
      );
    } catch (error) {
      console.warn(
        "Failed to update link index for checklist:",
        updatedList.uuid,
        error,
      );
    }

    if (oldFilePath && oldFilePath !== filePath) {
      await serverDeleteFile(oldFilePath);
    }

    try {
      revalidatePath("/");
      revalidatePath(
        `/checklist/${currentList.owner}/${updatedList.uuid}`,
      );
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error,
      );
    }

    await logContentEvent(
      "checklist_updated",
      "checklist",
      updatedList.uuid,
      updatedList.title,
      true,
      { category: updatedList.category },
    );

    await broadcast({
      type: "checklist",
      action: "updated",
      entityId: updatedList.uuid,
      username: actingUser.username,
    });

    return { success: true, data: updatedList };
  } catch (error) {
    try {
      const { title, uuid } = getFormData(formData, ["title", "uuid"]);
      await logContentEvent(
        "checklist_updated",
        "checklist",
        uuid!,
        title || "unknown",
        false,
      );
    } catch {}
    return { error: "Failed to update list" };
  }
};

export const deleteList = async (formData: FormData) => {
  try {
    const uuid = formData.get("uuid") as string;
    const apiUser = formData.get("apiUser") as string | null;

    if (!uuid) return { error: "UUID is required" };

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

    const list = await getListById(uuid, undefined, currentUser.username);

    if (!list) {
      return { error: "List not found" };
    }

    const canDelete = await checkUserPermission(
      list.uuid,
      ItemTypes.CHECKLIST,
      currentUser.username,
      PermissionTypes.DELETE,
      list.owner,
    );

    if (!canDelete) {
      return { error: "Permission denied" };
    }

    const ownerUsername = list.owner || currentUser.username;
    const ownerDir = path.join(
      process.cwd(),
      "data",
      CHECKLISTS_FOLDER,
      ownerUsername,
    );
    const filePath = path.join(
      ownerDir,
      list.category || "Uncategorized",
      `${list.slug}.md`,
    );

    await serverDeleteFile(filePath);

    try {
      await removeItemFromIndex(list.owner!, ItemTypes.CHECKLIST, list.uuid);
    } catch (error) {
      console.warn(
        "Failed to remove checklist from link index:",
        list.uuid,
        error,
      );
    }

    if (list.owner) {
      const { updateSharingData } = await import(
        "@/app/_server/actions/sharing"
      );
      await updateSharingData(
        {
          uuid: list.uuid,
          itemType: ItemTypes.CHECKLIST,
          sharer: list.owner,
        },
        null,
      );
    }

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${list.owner}/${list.uuid}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error,
      );
    }
    await logContentEvent(
      "checklist_deleted",
      "checklist",
      list.uuid,
      list.title || "unknown",
      true,
      { category: list.category },
    );
    await broadcast({
      type: "checklist",
      action: "deleted",
      entityId: list.uuid,
      username: currentUser.username,
    });

    return { success: true };
  } catch (error) {
    try {
      const { title, uuid } = getFormData(formData, ["title", "uuid"]);
      await logContentEvent(
        "checklist_deleted",
        "checklist",
        uuid || "unknown",
        title || "unknown",
        false,
      );
    } catch {}
    return { error: "Failed to delete list" };
  }
};

export const cloneChecklist = async (formData: FormData) => {
  try {
    const uuid = formData.get("uuid") as string;
    const targetCategory = formData.get("category") as string;
    const ownerUsername = formData.get("user") as string | null;

    const currentUser = await getCurrentUser();
    const checklist = await getListById(
      uuid,
      ownerUsername || undefined,
      currentUser?.username,
    );
    if (!checklist) {
      return { error: "Checklist not found" };
    }

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
      fileRenameMode,
    );
    const filePath = path.join(categoryDir, filename);

    const content = listToMarkdown(checklist);
    const newUuid = generateUuid();
    const updatedContent = updateYamlMetadata(content, {
      uuid: newUuid,
      title: cloneTitle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await serverWriteFile(filePath, updatedContent);

    const clonedChecklist = await getListById(
      newUuid,
      currentUser?.username,
      currentUser?.username,
    );

    try {
      revalidatePath("/");
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but checklist was cloned successfully:",
        error,
      );
    }

    await broadcast({
      type: "checklist",
      action: "created",
      entityId: newUuid,
      username: currentUser?.username || "",
    });

    return { success: true, data: clonedChecklist };
  } catch (error) {
    console.error("Error cloning checklist:", error);
    return { error: "Failed to clone checklist" };
  }
};
