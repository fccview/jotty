"use server";

import path from "path";
import fs from "fs/promises";
import { ARCHIVED_DIR_NAME, EXCLUDED_DIRS } from "@/app/_consts/files";
import {
  serverReadDir,
  serverReadFile,
  serverWriteFile,
  readOrderFile,
} from "@/app/_server/actions/file";
import {
  extractYamlMetadata,
  generateUuid,
  updateYamlMetadata,
} from "@/app/_utils/yaml-metadata-utils";
import {
  grepExtractFrontmatter,
  grepExtractExcerpt,
} from "@/app/_utils/grep-utils";
import { parseMarkdownNote } from "./parsers";
import { Note } from "@/app/_types";

export const readNotesRecursively = async (
  dir: string,
  basePath: string = "",
  owner: string,
  allowArchived: boolean = false,
  isRaw: boolean = false,
  metadataOnly: boolean = false,
  excerptLength?: number,
): Promise<any[]> => {
  const notes: any[] = [];
  const entries = await serverReadDir(dir);
  let excludedDirs = EXCLUDED_DIRS;

  if (!allowArchived) {
    excludedDirs = [...EXCLUDED_DIRS, ARCHIVED_DIR_NAME];
  }

  const order = await readOrderFile(dir);
  const dirNames = entries
    .filter((e) => e.isDirectory() && !excludedDirs.includes(e.name))
    .map((e) => e.name);
  const orderedDirNames: string[] = order?.categories
    ? [
        ...order.categories.filter((n) => dirNames.includes(n)),
        ...dirNames
          .filter((n) => !order.categories!.includes(n))
          .sort((a, b) => a.localeCompare(b)),
      ]
    : dirNames.sort((a, b) => a.localeCompare(b));

  for (const dirName of orderedDirNames) {
    const categoryPath = basePath ? `${basePath}/${dirName}` : dirName;
    const categoryDir = path.join(dir, dirName);

    try {
      const files = await serverReadDir(categoryDir);
      const mdFiles = files.filter((f) => f.isFile() && f.name.endsWith(".md"));
      const ids = mdFiles.map((f) => path.basename(f.name, ".md"));
      const categoryOrder = await readOrderFile(categoryDir);
      const orderedIds: string[] = categoryOrder?.items
        ? [
            ...categoryOrder.items.filter((id) => ids.includes(id)),
            ...ids
              .filter((id) => !categoryOrder.items!.includes(id))
              .sort((a, b) => a.localeCompare(b)),
          ]
        : ids.sort((a, b) => a.localeCompare(b));

      for (const id of orderedIds) {
        const fileName = `${id}.md`;
        const filePath = path.join(categoryDir, fileName);
        try {
          const stats = await fs.stat(filePath);

          if (metadataOnly) {
            const metadata = await grepExtractFrontmatter(filePath);
            const tags = Array.isArray(metadata?.tags)
              ? (metadata.tags as string[])
              : [];
            const metadataNote: Partial<Note> = {
              id,
              uuid:
                typeof metadata?.uuid === "string" ? metadata.uuid : undefined,
              title: typeof metadata?.title === "string" ? metadata.title : id,
              category: categoryPath,
              createdAt: stats.birthtime.toISOString(),
              updatedAt: stats.mtime.toISOString(),
              owner,
              isShared: false,
              encrypted: metadata?.encrypted === true,
              tags,
            };
            notes.push(metadataNote);
          } else if (excerptLength) {
            const metadata = await grepExtractFrontmatter(filePath);
            const tags = Array.isArray(metadata?.tags)
              ? (metadata.tags as string[])
              : [];
            const excerpt = await grepExtractExcerpt(filePath, excerptLength);
            const excerptNote: Partial<Note> = {
              id,
              uuid:
                typeof metadata?.uuid === "string" ? metadata.uuid : undefined,
              title: typeof metadata?.title === "string" ? metadata.title : id,
              content: excerpt,
              category: categoryPath,
              createdAt: stats.birthtime.toISOString(),
              updatedAt: stats.mtime.toISOString(),
              owner,
              isShared: false,
              encrypted: metadata?.encrypted === true,
              tags,
            };
            notes.push(excerptNote);
          } else {
            const content = await serverReadFile(filePath);

            if (isRaw) {
              const { metadata } = extractYamlMetadata(content);
              let uuid = metadata.uuid;
              if (!uuid) {
                uuid = generateUuid();
                try {
                  const updatedContent = updateYamlMetadata(content, { uuid });
                  await serverWriteFile(filePath, updatedContent);
                } catch (error) {
                  console.warn("Failed to save UUID to note file:", error);
                }
              }
              const rawNote: Note & { rawContent: string } = {
                id,
                uuid,
                title: id,
                content: "",
                category: categoryPath,
                createdAt: stats.birthtime.toISOString(),
                updatedAt: stats.mtime.toISOString(),
                owner,
                isShared: false,
                rawContent: content,
              };
              notes.push(rawNote);
            } else {
              notes.push(
                parseMarkdownNote(
                  content,
                  id,
                  categoryPath,
                  owner,
                  false,
                  stats,
                  fileName,
                ),
              );
            }
          }
        } catch {}
      }
    } catch {}

    const subDocs = await readNotesRecursively(
      categoryDir,
      categoryPath,
      owner,
      allowArchived,
      isRaw,
      metadataOnly,
      excerptLength,
    );
    notes.push(...subDocs);
  }

  return notes;
};
