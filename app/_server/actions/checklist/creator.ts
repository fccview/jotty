import path from "path";
import { Checklist, ChecklistType, User } from "@/app/_types";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { ensureDir, serverWriteFile } from "@/app/_server/actions/file";
import { generateUniqueFilename } from "@/app/_utils/filename-utils";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { updateIndexForItem, parseInternalLinks } from "@/app/_server/actions/link";
import { targetDir, bouncer } from "@/app/_server/actions/share/target";
import { generateUuid } from "@/app/_utils/yaml-metadata-utils";
import { logContentEvent } from "@/app/_server/actions/log";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { getFormData } from "@/app/_utils/global-utils";

/**
 * Server-only checklist creation. The acting principal is passed in already
 * authenticated (cookie session or API key); nothing about identity is ever
 * read from the FormData.
 */
export const makeList = async (
  actor: User,
  formData: FormData,
): Promise<{ success?: boolean; data?: Checklist; error?: string }> => {
  try {
    const title = formData.get("title") as string;
    const category = (formData.get("category") as string) || UNCATEGORIZED;
    const type = (formData.get("type") as ChecklistType) || "simple";

    const target = await targetDir(Modes.CHECKLISTS, actor.username, category);
    const verdict = await bouncer(
      target,
      actor.username,
      PermissionTypes.CREATE,
    );

    if (!verdict.allowed) {
      return { error: verdict.error };
    }

    const categoryDir = target.dir;
    await ensureDir(categoryDir);

    const fileRenameMode = actor.fileRenameMode || "minimal";
    const filename = await generateUniqueFilename(
      categoryDir,
      title,
      ".md",
      fileRenameMode,
    );
    const id = path.basename(filename, ".md");
    const filePath = path.join(categoryDir, filename);

    const newList: Checklist = {
      id,
      uuid: generateUuid(),
      title,
      type,
      category: target.category,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: target.owner,
    };

    await serverWriteFile(filePath, listToMarkdown(newList));

    try {
      const content = newList.items.map((i) => i.text).join("\n");
      const links = await parseInternalLinks(content);
      const indexUsername = target.owner;
      if (indexUsername) {
        await updateIndexForItem(
          indexUsername,
          ItemTypes.CHECKLIST,
          newList.uuid!,
          links,
        );
      }
    } catch (error) {
      console.warn(
        "Failed to update link index for new checklist:",
        newList.id,
        error,
      );
    }

    await logContentEvent(
      "checklist_created",
      "checklist",
      newList.uuid!,
      newList.title,
      true,
      { category: newList.category },
    );

    await broadcast({
      type: "checklist",
      action: "created",
      entityId: newList.uuid,
      username: actor.username,
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
