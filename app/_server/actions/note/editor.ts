import path from "path";
import { SanitisedUser } from "@/app/_types";
import { freeFilename, generateUniqueFilename } from "@/app/_utils/filename-utils";
import {
  detectEncryptionMethod,
  isEncrypted,
} from "@/app/_utils/encryption-utils";
import {
  ensureDir,
  serverDeleteFile,
  serverWriteFile,
} from "@/app/_server/actions/file";
import { revalidatePath } from "next/cache";
import { NOTES_DIR } from "@/app/_consts/files";
import { PermissionTypes, Modes } from "@/app/_types/enums";
import { sanitizeMarkdown } from "@/app/_utils/markdown-utils";
import { extractHashtagsFromContent } from "@/app/_utils/tag-utils";
import { getFormData } from "@/app/_utils/global-utils";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { tidyItemLinks } from "@/app/_server/actions/relations/tidy";
import { canReach } from "@/app/_server/actions/share/queries";
import {
  extractYamlMetadata as stripYaml,
  strayMeta,
  keptMeta,
} from "@/app/_utils/yaml-metadata-utils";
import { logContentEvent } from "@/app/_server/actions/log";
import { commitNote } from "@/app/_server/actions/history/repo";
import { noteToMarkdown } from "./parsers";
import { getNoteById } from "./queries";
import {
  targetDir,
  bouncer,
  shownAs,
  movePlan,
  refusalMessage,
} from "@/app/_server/actions/share/target";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import {
  failedWith,
  readOnlyNotice,
} from "@/app/_server/actions/lib/read-only-message";
import { isWritable } from "@/app/_server/actions/lib/read-only";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { fenceFilename } from "@/app/_server/actions/lib/filename-fence";

const _noteDirFor = (owner: string, category?: string): string =>
  path.join(process.cwd(), NOTES_DIR(owner), category || UNCATEGORIZED);

const _editNote = async (
  actor: SanitisedUser,
  formData: FormData,
  autosaveNotes: boolean,
) => {
  try {
    const { title, content, category, uuid } = getFormData(formData, [
      "title",
      "content",
      "category",
      "uuid",
    ]);

    const actingUsername = actor.username;

    if (!actingUsername) {
      return { error: "Not authenticated" };
    }

    const note = await getNoteById(uuid);

    if (!note) {
      throw new Error("Note not found");
    }

    const canEdit = await canReach(
      note.uuid!,
      "note",
      actingUsername,
      PermissionTypes.EDIT,
    );

    if (!canEdit) {
      return { error: "Permission denied" };
    }

    const shownSource = await shownAs(
      Modes.NOTES,
      actingUsername,
      note.owner!,
      note.category || "",
    );

    const shownCategory = category || shownSource;
    const { home, destination, target, isMoving } = await movePlan(
      Modes.NOTES,
      actingUsername,
      note,
      shownCategory,
    );

    if (isMoving) {
      const verdict = await bouncer(
        target,
        actingUsername,
        PermissionTypes.CREATE,
      );

      if (!verdict.allowed) {
        return { error: verdict.error };
      }

      const canRemove = await canReach(
        note.uuid!,
        "note",
        actingUsername,
        PermissionTypes.DELETE,
      );

      if (!canRemove) {
        return { error: await refusalMessage() };
      }
    }

    const sanitizedContent = sanitizeMarkdown(content);
    const { metadata: incomingMeta, contentWithoutMetadata } =
      stripYaml(sanitizedContent);
    const convertedContent = isEncrypted(contentWithoutMetadata)
      ? contentWithoutMetadata
      : await tidyItemLinks(contentWithoutMetadata, note.owner || actingUsername);

    const encryptionMethod =
      detectEncryptionMethod(convertedContent) || undefined;

    const extractedTags = extractHashtagsFromContent(convertedContent);
    const sortedTags = Array.from(new Set(extractedTags)).sort();

    const updatedDoc = {
      ...note,
      title,
      content: convertedContent,
      category: destination.category,
      owner: destination.owner,
      updatedAt: new Date().toISOString(),
      encrypted: isEncrypted(convertedContent),
      encryptionMethod,
      tags: sortedTags.length > 0 ? sortedTags : undefined,
      extraMetadata: keptMeta(note.extraMetadata, strayMeta(incomingMeta)),
    };

    const sourceDir = _noteDirFor(home.owner, home.category);
    const categoryDir = _noteDirFor(destination.owner, destination.category);
    await ensureDir(categoryDir);

    const currentId = note.id;
    let newFilename: string;
    let newId = currentId;

    if (title !== note.title) {
      const fileRenameMode = actor.fileRenameMode || "minimal";
      newFilename = await generateUniqueFilename(
        categoryDir,
        title,
        ".md",
        fileRenameMode,
      );
      newId = path.basename(newFilename, ".md");
    } else if (isMoving) {
      newFilename = await freeFilename(categoryDir, currentId);
      newId = path.basename(newFilename, ".md");
    } else {
      newFilename = `${currentId}.md`;
    }

    if (newId !== currentId) {
      updatedDoc.id = newId;
    }

    const straying = await fenceFilename(categoryDir, newFilename);
    if (straying) {
      return { error: straying };
    }

    const filePath = path.join(categoryDir, newFilename);

    const oldFilePath =
      isMoving || newId !== currentId
        ? path.join(sourceDir, `${currentId}.md`)
        : null;

    const leavesSource = oldFilePath !== null && oldFilePath !== filePath;
    if (leavesSource && !(await isWritable(sourceDir))) {
      return { error: await readOnlyNotice() };
    }

    await serverWriteFile(filePath, noteToMarkdown(updatedDoc));

    if (!autosaveNotes && !updatedDoc.encrypted) {
      const historyRelativePath = path.join(
        updatedDoc.category || UNCATEGORIZED,
        `${newId}.md`,
      );

      const historyAction = isMoving ? "move" : "update";

      const historyMetadata = isMoving
        ? {
            oldCategory: home.category || UNCATEGORIZED,
            newCategory: updatedDoc.category || UNCATEGORIZED,
            oldPath: path.join(
              home.category || UNCATEGORIZED,
              `${currentId}.md`,
            ),
          }
        : undefined;

      commitNote(
        destination.owner,
        historyRelativePath,
        historyAction,
        title,
        historyMetadata,
      ).catch(() => {});
    }

    if (oldFilePath && oldFilePath !== filePath) {
      await serverDeleteFile(oldFilePath);
    }

    try {
      if (!autosaveNotes) {
        revalidatePath("/");
        revalidatePath(`/note/${note.uuid}`);
      }
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error,
      );
    }

    if (!updatedDoc.encrypted) {
      await logContentEvent(
        "note_updated",
        "note",
        note.uuid!,
        updatedDoc.title,
        true,
        { category: updatedDoc.category },
      );
    }

    await broadcast({
      type: "note",
      action: "updated",
      entityId: updatedDoc.uuid,
      username: actingUsername,
    });

    return {
      success: true,
      data: { ...updatedDoc, category: shownCategory },
    };
  } catch (error) {
    console.error("Error updating note:", error);
    const { title, uuid } = getFormData(formData, ["title", "uuid"]);
    await logContentEvent(
      "note_updated",
      "note",
      uuid!,
      title || "unknown",
      false,
    );
    return { error: await failedWith(error, "Failed to update note") };
  }
};

export const editNote = async (
  actor: SanitisedUser,
  formData: FormData,
  autosaveNotes = false,
) =>
  runQueued(itemLane(Modes.NOTES, formData.get("uuid") as string), () =>
    _editNote(actor, formData, autosaveNotes),
  );

const _dropNote = async (
  currentUser: SanitisedUser,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> => {
  try {
    const { uuid } = getFormData(formData, ["uuid"]);

    if (!currentUser?.username) {
      return { error: "Not authenticated" };
    }

    const note = await getNoteById(uuid!);

    if (!note) {
      return { error: "Document not found" };
    }

    const canDelete = await canReach(
      note.uuid!,
      "note",
      currentUser.username,
      PermissionTypes.DELETE,
    );

    if (!canDelete) {
      return { error: "Permission denied" };
    }

    const ownerUsername = note.owner || currentUser.username;
    const source = await targetDir(
      Modes.NOTES,
      currentUser.username,
      note.category || "",
    );

    const verdict = await bouncer(
      source,
      currentUser.username,
      PermissionTypes.DELETE,
    );

    if (!verdict.allowed) {
      return { error: verdict.error };
    }

    const homeCategory = note.category || UNCATEGORIZED;
    const ownerDir = NOTES_DIR(ownerUsername);
    const filePath = path.join(ownerDir, homeCategory, `${note.id}.md`);

    await serverDeleteFile(filePath);

    if (!note.encrypted) {
      const deleteRelativePath = path.join(homeCategory, `${note.id}.md`);
      commitNote(
        ownerUsername,
        deleteRelativePath,
        "delete",
        note.title || note.id,
      ).catch(() => {});
    }

    try {
      revalidatePath("/");
      revalidatePath(`/note/${note.uuid}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error,
      );
    }

    await logContentEvent(
      "note_deleted",
      "note",
      note.uuid!,
      note.title!,
      true,
      { category: note.category },
    );

    await broadcast({
      type: "note",
      action: "deleted",
      entityId: note.uuid,
      username: currentUser.username,
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting note:", error);

    const { uuid } = getFormData(formData, ["uuid"]);

    let title = "unknown";
    try {
      const note = await getNoteById(uuid!);
      title = note?.title || "unknown";
    } catch (lookupError) {
      console.warn(
        "Failed to re-read note while logging deletion:",
        lookupError,
      );
    }

    await logContentEvent("note_deleted", "note", uuid!, title, false);
    return { error: await failedWith(error, "Failed to delete note") };
  }
};

export const dropNote = async (actor: SanitisedUser, formData: FormData) =>
  runQueued(itemLane(Modes.NOTES, formData.get("uuid") as string), () =>
    _dropNote(actor, formData),
  );
