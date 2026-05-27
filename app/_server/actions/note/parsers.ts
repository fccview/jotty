import path from "path";
import { Note } from "@/app/_types";
import {
  extractYamlMetadata,
  extractTitle,
  generateYamlFrontmatter,
  generateUuid,
} from "@/app/_utils/yaml-metadata-utils";

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
    createdAt: fileStats
      ? fileStats.birthtime.toISOString()
      : new Date().toISOString(),
    updatedAt: fileStats
      ? fileStats.mtime.toISOString()
      : new Date().toISOString(),
    owner,
    isShared,
    encrypted: metadata.encrypted || false,
    encryptionMethod: metadata.encryptionMethod,
    tags: Array.isArray(metadata.tags) ? metadata.tags : [],
  };
};

export const convertInternalLinksToNewFormat = async (
  content: string,
  username?: string,
  category?: string
): Promise<string> => {
  let convertedContent = content;

  // @ts-ignore
  const spanRegex = /<span[^>]*data-internal-link[^>]*>.*?<\/span>/gs;
  const spanMatches = Array.from(content.matchAll(spanRegex));

  for (const match of spanMatches) {
    const [fullMatch] = match;
    const hrefMatch = fullMatch.match(/data-href="([^"]*)"/);
    const convertMatch = fullMatch.match(
      /data-convert-to-bidirectional="([^"]*)"/
    );

    const href = hrefMatch?.[1];
    const shouldConvert = convertMatch?.[1] === "true";

    if (!shouldConvert || !href) {
      continue;
    }

    if (href.startsWith("/jotty/")) {
      continue;
    }

    if (href.startsWith("/note/")) {
      const parts = href.split("/");
      if (parts.length >= 3) {
        const categoryAndId = parts.slice(2).join("/");
        const lastSlashIndex = categoryAndId.lastIndexOf("/");
        const id = categoryAndId.substring(lastSlashIndex + 1);

        try {
          const { getUserNotes } = await import("./queries");
          const notes = await getUserNotes({ username, allowArchived: true });
          if (notes.success && notes.data) {
            const note = notes.data.find((n) => n.id === id);
            if (note?.uuid) {
              let updatedSpan = fullMatch
                .replace(/data-href="[^"]*"/, `data-href="/jotty/${note.uuid}"`)
                .replace(
                  /data-convert-to-bidirectional="true"/,
                  `data-convert-to-bidirectional="false"`
                );

              if (fullMatch.includes("data-uuid=")) {
                updatedSpan = updatedSpan.replace(
                  /data-uuid="[^"]*"/,
                  `data-uuid="${note.uuid}"`
                );
              } else {
                updatedSpan = updatedSpan.replace(
                  "data-internal-link",
                  `data-internal-link data-uuid="${note.uuid}"`
                );
              }
              convertedContent = convertedContent.replace(
                fullMatch,
                updatedSpan
              );
            }
          }
        } catch (error) {
          console.warn("Failed to convert note link:", href, error);
        }
      }
    } else if (href.startsWith("/checklist/")) {
      const parts = href.split("/");
      if (parts.length >= 3) {
        const categoryAndId = parts.slice(2).join("/");
        const lastSlashIndex = categoryAndId.lastIndexOf("/");
        const id = categoryAndId.substring(lastSlashIndex + 1);

        try {
          const { getUserChecklists } = await import("../checklist");
          const checklists = await getUserChecklists({
            username,
            isRaw: true,
            allowArchived: true,
          });
          if (checklists.success && checklists.data) {
            const checklist = checklists.data.find((c) => c.id === id);
            if (checklist?.uuid) {
              let updatedSpan = fullMatch
                .replace(
                  /data-href="[^"]*"/,
                  `data-href="/jotty/${checklist.uuid}"`
                )
                .replace(
                  /data-convert-to-bidirectional="true"/,
                  `data-convert-to-bidirectional="false"`
                );

              if (fullMatch.includes("data-uuid=")) {
                updatedSpan = updatedSpan.replace(
                  /data-uuid="[^"]*"/,
                  `data-uuid="${checklist.uuid}"`
                );
              } else {
                updatedSpan = updatedSpan.replace(
                  "data-internal-link",
                  `data-internal-link data-uuid="${checklist.uuid}"`
                );
              }
              convertedContent = convertedContent.replace(
                fullMatch,
                updatedSpan
              );
            }
          }
        } catch (error) {
          console.warn("Failed to convert checklist link:", href, error);
        }
      }
    }
  }

  return convertedContent;
};

export const noteToMarkdown = (note: Note): string => {
  const metadata: any = {};
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

  const frontmatter = generateYamlFrontmatter(metadata);

  return `${frontmatter}${content}`.trim();
};
