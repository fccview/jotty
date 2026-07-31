import path from "path";
import { Note, User } from "@/app/_types";
import { Modes, PermissionTypes } from "@/app/_types/enums";
import { ensureDir, serverWriteFile } from "@/app/_server/actions/file";
import { generateUniqueFilename } from "@/app/_utils/filename-utils";
import {
  detectEncryptionMethod,
  isEncrypted,
} from "@/app/_utils/encryption-utils";
import { sanitizeMarkdown } from "@/app/_utils/markdown-utils";
import { extractHashtagsFromContent } from "@/app/_utils/tag-utils";
import { getFormData } from "@/app/_utils/global-utils";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { updateIndexForItem, parseInternalLinks } from "@/app/_server/actions/link";
import {
  extractYamlMetadata as stripYaml,
  generateUuid,
} from "@/app/_utils/yaml-metadata-utils";
import { logContentEvent } from "@/app/_server/actions/log";
import { commitNote } from "@/app/_server/actions/history";
import { targetDir, bouncer } from "@/app/_server/actions/share/target";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { noteToMarkdown } from "./parsers";

/**
 * Server-only note creation. The acting principal is passed in already
 * authenticated (cookie session or API key); nothing about identity is ever
 * read from the FormData.
 */
export const makeNote = async (
  actor: User,
  formData: FormData,
): Promise<{ success?: boolean; data?: Note; error?: string }> => {
  try {
    const { title, category, rawContent } = getFormData(formData, [
      "title",
      "category",
      "rawContent",
    ]);

    const sanitizedContent = sanitizeMarkdown(rawContent);
    const { contentWithoutMetadata } = stripYaml(sanitizedContent);
    const content = contentWithoutMetadata;
    const encryptionMethod = detectEncryptionMethod(content) || undefined;
    const encrypted = isEncrypted(content);

    const target = await targetDir(Modes.NOTES, actor.username, category);

    if (target.isMount) {
      const verdict = await bouncer(
        target,
        actor.username,
        PermissionTypes.EDIT,
      );

      if (!verdict.allowed) {
        return { error: verdict.error };
      }
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

    const extractedTags = extractHashtagsFromContent(content);

    const newDoc: Note = {
      id,
      uuid: generateUuid(),
      title,
      content,
      category: target.category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: target.owner,
      tags: extractedTags.length > 0 ? extractedTags : undefined,
      encrypted: encrypted || undefined,
      encryptionMethod,
    };

    await serverWriteFile(filePath, noteToMarkdown(newDoc));

    const relativePath = path.join(
      target.category || UNCATEGORIZED,
      `${id}.md`,
    );

    if (!isEncrypted(content)) {
      commitNote(target.owner, relativePath, "create", title).catch(() => { });
    }

    try {
      const links = (await parseInternalLinks(newDoc.content)) || [];
      await updateIndexForItem(target.owner, "note", newDoc.uuid!, links);
    } catch (error) {
      console.warn(
        "Failed to update link index for new note:",
        newDoc.id,
        error,
      );
    }

    await logContentEvent(
      "note_created",
      "note",
      newDoc.uuid!,
      newDoc.title,
      true,
      { category: newDoc.category },
    );

    await broadcast({
      type: "note",
      action: "created",
      entityId: newDoc.uuid,
      username: actor.username,
    });

    return { success: true, data: newDoc };
  } catch (error) {
    const { title } = getFormData(formData, ["title"]);
    console.error("Error creating note:", error);
    await logContentEvent("note_created", "note", "", title || "unknown", false);
    return { error: "Failed to create note" };
  }
};
