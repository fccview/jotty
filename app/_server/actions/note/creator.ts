import path from "path";
import { getTranslations } from "next-intl/server";
import { Note, SanitisedUser } from "@/app/_types";
import { Modes, PermissionTypes } from "@/app/_types/enums";
import { ensureDir, serverWriteFile } from "@/app/_server/actions/file";
import { generateUniqueFilename } from "@/app/_utils/filename-utils";
import {
  detectEncryptionMethod,
  isEncrypted,
} from "@/app/_utils/encryption-utils";
import { sanitizeMarkdown } from "@/app/_utils/markdown-utils";
import { mergeTags } from "@/app/_utils/tag-utils";
import { getFormData } from "@/app/_utils/global-utils";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { tidyItemLinks } from "@/app/_server/actions/relations/tidy";
import {
  extractYamlMetadata as stripYaml,
  generateUuid,
  strayMeta,
} from "@/app/_utils/yaml-metadata-utils";
import { logContentEvent } from "@/app/_server/actions/log";
import { commitNote } from "@/app/_server/actions/history/repo";
import { targetDir, bouncer, reservedRefusal } from "@/app/_server/actions/share/target";
import { isReservedCategory } from "@/app/_utils/category-path-utils";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { noteToMarkdown } from "./parsers";
import { failedWith } from "@/app/_server/actions/lib/read-only-message";
import { fenceFilename } from "@/app/_server/actions/lib/filename-fence";
import { ownTemplate } from "@/app/_server/actions/template/reader";
import { carriedMeta, fillTemplate } from "@/app/_utils/template-utils";
import { TEMPLATE_ID_FIELD, TemplateVariables } from "@/app/_consts/templates";
import { carryAttachments } from "@/app/_server/actions/attachments/lifecycle";
import { rehomeRefs } from "@/app/_server/actions/attachments/adopt";

type StartingText =
  | { content: string; meta?: Record<string, unknown>; source?: string }
  | { error: string };

const _mergedMeta = (
  carried?: Record<string, unknown>,
  written?: Record<string, unknown>,
): Record<string, unknown> | undefined =>
  carried || written ? { ...carried, ...written } : undefined;

const _fromTemplate = async (
  actor: SanitisedUser,
  templateId: string,
  title: string,
  rawContent: string,
): Promise<StartingText> => {
  const t = await getTranslations("errors");

  if (rawContent) {
    console.warn("Refusing note with both a template and content:", templateId);
    return { error: t("templateWithContent") };
  }

  const template = await ownTemplate(actor.username, templateId);

  if (!template) {
    console.warn("Refusing note from a template the actor does not own:", templateId);
    return { error: t("templateNotFound") };
  }

  if (template.encrypted || isEncrypted(template.content || "")) {
    console.warn("Refusing note from an encrypted template:", templateId);
    return { error: t("templateEncrypted") };
  }

  return {
    content: fillTemplate(template.content || "", {
      [TemplateVariables.TITLE]: title,
      [TemplateVariables.USER]: actor.username,
    }),
    meta: carriedMeta(template.extraMetadata),
    source: template.uuid,
  };
};

export const makeNote = async (
  actor: SanitisedUser,
  formData: FormData,
): Promise<{ success?: boolean; data?: Note; error?: string }> => {
  try {
    const { title, category, rawContent, templateId } = getFormData(formData, [
      "title",
      "category",
      "rawContent",
      TEMPLATE_ID_FIELD,
    ]);

    if (isReservedCategory(category)) {
      return { error: await reservedRefusal(category) };
    }

    const starting: StartingText = templateId
      ? await _fromTemplate(actor, templateId, title, rawContent)
      : { content: rawContent };

    if ("error" in starting) {
      return { error: starting.error };
    }

    const sanitizedContent = sanitizeMarkdown(starting.content);
    const { metadata, contentWithoutMetadata } = stripYaml(sanitizedContent);
    const body = contentWithoutMetadata.trim();
    const encryptionMethod = detectEncryptionMethod(body) || undefined;
    const encrypted = isEncrypted(body);

    const target = await targetDir(Modes.NOTES, actor.username, category);

    if (category && !target.isMount && target.category !== category) {
      console.warn("Refusing note outside its owner's folder:", category);
      const t = await getTranslations("errors");
      return { error: t("categoryOutOfBounds") };
    }

    const content = encrypted
      ? body
      : await tidyItemLinks(body, target.owner);

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
    const straying = await fenceFilename(categoryDir, filename);
    if (straying) {
      return { error: straying };
    }

    const id = path.basename(filename, ".md");
    const filePath = path.join(categoryDir, filename);

    const noteTags = mergeTags(metadata?.tags, "", content);

    const uuid = generateUuid();
    const carried = starting.source
      ? await carryAttachments(starting.source, uuid, content)
      : content;
    const newDoc: Note = {
      id,
      uuid,
      title,
      content: encrypted ? carried : await rehomeRefs(uuid, actor.username, carried),
      category: target.category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: target.owner,
      tags: noteTags.length > 0 ? noteTags : undefined,
      encrypted: encrypted || undefined,
      encryptionMethod,
      extraMetadata: _mergedMeta(starting.meta, strayMeta(metadata)),
    };

    await serverWriteFile(filePath, noteToMarkdown(newDoc));

    const relativePath = path.join(
      target.category || UNCATEGORIZED,
      `${id}.md`,
    );

    if (!isEncrypted(content)) {
      commitNote(target.owner, relativePath, "create", title).catch(() => {});
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
    await logContentEvent(
      "note_created",
      "note",
      "",
      title || "unknown",
      false,
    );
    return { error: await failedWith(error, "Failed to create note") };
  }
};
