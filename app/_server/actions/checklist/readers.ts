"use server";

import path from "path";
import fs from "fs/promises";
import { Checklist } from "@/app/_types";
import { ARCHIVED_DIR_NAME } from "@/app/_consts/files";
import {
  serverReadDir,
  serverReadFile,
  serverWriteFile,
  readOrderFile,
} from "@/app/_server/actions/file";
import { parseMarkdown } from "@/app/_utils/checklist-utils";
import {
  extractYamlMetadata,
  generateUuid,
  updateYamlMetadata,
} from "@/app/_utils/yaml-metadata-utils";
import { grepExtractFrontmatter } from "@/app/_utils/grep-utils";
import { getChecklistType } from "./parsers";

export const readListsRecursively = async (
  dir: string,
  basePath: string = "",
  owner: string,
  allowArchived?: boolean,
  isRaw: boolean = false,
  metadataOnly: boolean = false
): Promise<any[]> => {
  const lists: any[] = [];
  const entries = await serverReadDir(dir);

  const order = await readOrderFile(dir);
  const dirNames = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  const orderedDirNames: string[] = order?.categories
    ? [
        ...order.categories.filter((n) => dirNames.includes(n)),
        ...dirNames
          .filter((n) => !order.categories!.includes(n))
          .sort((a, b) => a.localeCompare(b)),
      ]
    : dirNames.sort((a, b) => a.localeCompare(b));

  for (const dirName of orderedDirNames) {
    if (dirName === ARCHIVED_DIR_NAME && !allowArchived) {
      continue;
    }

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
            const metadataList: Partial<Checklist> = {
              id,
              uuid: typeof metadata?.uuid === "string" ? metadata.uuid : undefined,
              title: typeof metadata?.title === "string" ? metadata.title : id,
              type: (metadata?.checklistType === "task" || metadata?.checklistType === "simple")
                ? metadata.checklistType
                : "simple",
              category: categoryPath,
              items: [],
              createdAt: stats.birthtime.toISOString(),
              updatedAt: stats.mtime.toISOString(),
              owner,
              isShared: false,
            };
            lists.push(metadataList);
          } else {
            const content = await serverReadFile(filePath);

            if (isRaw) {
              const { metadata } = extractYamlMetadata(content);
              const type = getChecklistType(content);
              let uuid = metadata.uuid;
              if (!uuid) {
                uuid = generateUuid();
                try {
                  const updatedContent = updateYamlMetadata(content, { uuid });
                  await serverWriteFile(filePath, updatedContent);
                } catch (error) {
                  console.warn("Failed to save UUID to checklist file:", error);
                }
              }
              const rawList: Checklist & { rawContent: string } = {
                id,
                title: id,
                uuid,
                type,
                category: categoryPath,
                items: [],
                createdAt: stats.birthtime.toISOString(),
                updatedAt: stats.mtime.toISOString(),
                owner: owner,
                isShared: false,
                rawContent: content,
              };
              lists.push(rawList);
            } else {
              const parsedList = parseMarkdown(
                content,
                id,
                categoryPath,
                owner,
                false,
                stats,
                fileName
              );
              lists.push(parsedList);
            }
          }
        } catch {}
      }
    } catch {}

    const subLists = await readListsRecursively(
      categoryDir,
      categoryPath,
      owner,
      allowArchived,
      isRaw,
      metadataOnly
    );
    lists.push(...subLists);
  }

  return lists;
};
