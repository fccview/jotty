import path from "path";
import { Checklist, SanitisedUser } from "@/app/_types";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import {
  ensureDir,
  serverWriteFile,
  serverDeleteFile,
} from "@/app/_server/actions/file";
import { revalidatePath } from "next/cache";
import { generateUniqueFilename, sanitizeFilename } from "@/app/_utils/filename-utils";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { getFormData } from "@/app/_utils/global-utils";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { canReach } from "@/app/_server/actions/share/queries";
import {
  targetDir,
  bouncer,
  shownAs,
  movePlan,
  refusalMessage,
} from "@/app/_server/actions/share/target";
import { logContentEvent } from "@/app/_server/actions/log";
import { getListById } from "./queries";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { failedWith } from "@/app/_server/actions/lib/read-only-message";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";

const _listDirFor = (owner: string, category?: string): string =>
  path.join(
    process.cwd(),
    "data",
    CHECKLISTS_FOLDER,
    owner,
    category || UNCATEGORIZED,
  );

const _editList = async (actingUser: SanitisedUser, formData: FormData) => {
  try {
    const uuid = formData.get("uuid") as string;
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;

    if (!actingUser?.username) {
      return { error: "Not authenticated" };
    }

    const currentList = await getListById(uuid);

    if (!currentList) {
      throw new Error("List not found");
    }

    const canEdit = await canReach(
      currentList.uuid!,
      ItemTypes.CHECKLIST,
      actingUser.username,
      PermissionTypes.EDIT
    );

    if (!canEdit) {
      return { error: "Permission denied" };
    }

    const shownSource = await shownAs(
      Modes.CHECKLISTS,
      actingUser.username,
      currentList.owner!,
      currentList.category || ""
    );

    const shownCategory = category || shownSource;
    const { home, destination, target, isMoving } = await movePlan(
      Modes.CHECKLISTS,
      actingUser.username,
      currentList,
      shownCategory
    );

    if (isMoving) {
      const verdict = await bouncer(
        target,
        actingUser.username,
        PermissionTypes.CREATE
      );

      if (!verdict.allowed) {
        return { error: verdict.error };
      }

      const canRemove = await canReach(
        currentList.uuid!,
        ItemTypes.CHECKLIST,
        actingUser.username,
        PermissionTypes.DELETE
      );

      if (!canRemove) {
        return { error: await refusalMessage() };
      }
    }

    const updatedList: Checklist = {
      ...currentList,
      title,
      category: destination.category,
      owner: destination.owner,
      items: currentList.items,
      updatedAt: new Date().toISOString(),
    };

    const sourceDir = _listDirFor(home.owner, home.category);
    const categoryDir = _listDirFor(destination.owner, destination.category);
    await ensureDir(categoryDir);

    const currentId = currentList.id;
    let newFilename: string;
    let newId = currentId;

    const fileRenameMode = actingUser?.fileRenameMode || "minimal";
    const sanitizedTitle = sanitizeFilename(title, fileRenameMode);
    const currentFilename = `${currentId}.md`;
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
      newFilename = `${currentId}.md`;
    }

    if (newId !== currentId) {
      updatedList.id = newId;
    }

    const filePath = path.join(categoryDir, newFilename);

    const oldFilePath =
      isMoving || newId !== currentId
        ? path.join(sourceDir, `${currentId}.md`)
        : null;

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    if (oldFilePath && oldFilePath !== filePath) {
      await serverDeleteFile(oldFilePath);
    }

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${currentList.uuid}`);
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

    await broadcast({ type: "checklist", action: "updated", entityId: updatedList.uuid, username: actingUser.username });

    return {
      success: true,
      data: { ...updatedList, category: shownCategory },
    };
  } catch (error) {
    console.error("Error in updateList:", error);
    try {
      const { title, uuid } = getFormData(formData, ["title", "uuid"]);
      await logContentEvent(
        "checklist_updated",
        "checklist",
        uuid!,
        title || "unknown",
        false
      );
    } catch (logError) {
      console.error("Failed to log the updateList failure:", logError);
    }
    return { error: await failedWith(error, "Failed to update list") };
  }
};

export const editList = async (actor: SanitisedUser, formData: FormData) =>
  runQueued(itemLane(Modes.CHECKLISTS, formData.get("uuid") as string), () =>
    _editList(actor, formData),
  );

const _dropList = async (
  currentUser: SanitisedUser,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> => {
  try {
    const uuid = formData.get("uuid") as string;

    if (!currentUser?.username) {
      return { error: "Not authenticated" };
    }

    const list = await getListById(uuid);

    if (!list) {
      return { error: "List not found" };
    }

    const canDelete = await canReach(
      list.uuid!,
      ItemTypes.CHECKLIST,
      currentUser.username,
      PermissionTypes.DELETE
    );

    if (!canDelete) {
      return { error: "Permission denied" };
    }

    const ownerUsername = list.owner || currentUser.username;
    const source = await targetDir(
      Modes.CHECKLISTS,
      currentUser.username,
      list.category || ""
    );

    const verdict = await bouncer(
      source,
      currentUser.username,
      PermissionTypes.DELETE
    );

    if (!verdict.allowed) {
      return { error: verdict.error };
    }

    const ownerDir = path.join(
      process.cwd(),
      "data",
      CHECKLISTS_FOLDER,
      ownerUsername
    );
    const filePath = path.join(
      ownerDir,
      list.category || UNCATEGORIZED,
      `${list.id}.md`
    );

    await serverDeleteFile(filePath);

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${list.uuid}`);
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
    await broadcast({ type: "checklist", action: "deleted", entityId: list.uuid, username: currentUser.username });

    return { success: true };
  } catch (error) {
    console.error("Error deleting list:", error);
    try {
      const { title, uuid } = getFormData(formData, ["title", "uuid"]);
      await logContentEvent(
        "checklist_deleted",
        "checklist",
        uuid || "unknown",
        title || "unknown",
        false
      );
    } catch (logError) {
      console.error("Failed to log the deleteList failure:", logError);
    }
    return { error: await failedWith(error, "Failed to delete list") };
  }
};

export const dropList = async (actor: SanitisedUser, formData: FormData) =>
  runQueued(itemLane(Modes.CHECKLISTS, formData.get("uuid") as string), () =>
    _dropList(actor, formData),
  );
