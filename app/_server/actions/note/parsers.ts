import path from "path";
import { Note } from "@/app/_types";
import {
  extractYamlMetadata,
  extractTitle,
  generateYamlFrontmatter,
  generateUuid,
  strayMeta,
  createdAtOf,
  OwnedMetaKeys,
} from "@/app/_utils/yaml-metadata-utils";
import { SHARED_WITH_KEY } from "@/app/_consts/sharing";

export const parseMarkdownNote = (
  content: string,
  id: string,
  category: string,
  owner?: string,
  isShared?: boolean,
  fileStats?: { birthtime: Date; mtime: Date },
  fileName?: string
): Note => {
  const { metadata, contentWithoutMetadata } = extractYamlMetadata(content);

  const title = extractTitle(
    content,
    fileName ? path.basename(fileName, ".md") : undefined
  );

  return {
    id,
    uuid: metadata.uuid || generateUuid(),
    title,
    content: contentWithoutMetadata,
    category,
    createdAt: createdAtOf(metadata, fileStats?.birthtime ?? new Date()),
    updatedAt: fileStats
      ? fileStats.mtime.toISOString()
      : new Date().toISOString(),
    owner,
    isShared,
    ...(metadata[SHARED_WITH_KEY] !== undefined && {
      sharedWith: metadata[SHARED_WITH_KEY] as string | string[],
    }),
    encrypted: metadata.encrypted || false,
    encryptionMethod: metadata.encryptionMethod,
    tags: Array.isArray(metadata.tags) ? metadata.tags : [],
    extraMetadata: strayMeta(metadata),
  };
};

export const noteToMarkdown = (note: Note): string => {
  const metadata: Record<string, unknown> = {
    ...(note.createdAt && { [OwnedMetaKeys.CREATED_AT]: note.createdAt }),
    ...(note.extraMetadata || {}),
  };
  metadata.uuid = note.uuid || generateUuid();

  let content = note.content || "";
  const lines = content.split("\n");

  if (!note.title && lines[0]?.trim().startsWith("# ")) {
    metadata.title = lines[0].trim().replace(/^#\s*/, "") || "Untitled Note";
    content = lines.slice(1).join("\n").trim();
  } else {
    metadata.title = note.title || "Untitled Note";
    content = lines.join("\n").trim();
  }

  if (note.encrypted) {
    metadata.encrypted = true;
    if (note.encryptionMethod) {
      metadata.encryptionMethod = note.encryptionMethod;
    }
  }

  if (note.tags && note.tags.length > 0) {
    metadata.tags = note.tags;
  }

  if (note.sharedWith !== undefined) {
    metadata[SHARED_WITH_KEY] = note.sharedWith;
  }

  const frontmatter = generateYamlFrontmatter(metadata);

  return `${frontmatter}${content}`.trim();
};
