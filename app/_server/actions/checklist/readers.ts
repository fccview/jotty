"use server";

import path from "path";
import fs from "fs/promises";
import { boxedShell } from "@/app/_utils/shell-utils";
import { Checklist } from "@/app/_types";
import { ARCHIVED_DIR_NAME, EXCLUDED_DIRS } from "@/app/_consts/files";
import {
  serverReadDir,
  serverReadFile,
  serverWriteFile,
  readOrderFile,
} from "@/app/_server/actions/file";
import { parseMarkdown } from "@/app/_utils/checklist-utils";
import {
  createdAtOf,
  extractYamlMetadata,
  generateUuid,
  toIso,
} from "@/app/_utils/yaml-metadata-utils";
import { grepExtractFrontmatter } from "@/app/_utils/grep-utils";
import type { FileStatsEntry } from "@/app/_server/actions/file";
import { dirUuids } from "@/app/_server/actions/share/category-info";
import { orderByUuids } from "@/app/_utils/order-utils";
import { getChecklistType } from "./parsers";
import { isDebugFlag } from "@/app/_utils/env-utils";
import { isKanbanType } from "@/app/_types/enums";
import { lacksUuid, stampUuid } from "@/app/_server/actions/lib/stamp-uuid";
import { titleFromFile } from "@/app/_server/actions/lib/file-title";
import { SHARED_WITH_KEY } from "@/app/_consts/sharing";
import { metaGrep, scanFrontmatter } from "@/app/_utils/frontmatter-scan";

const debugCrud = isDebugFlag("crud");

export type ChecklistReadResult =
  | Partial<Checklist>
  | Checklist
  | (Checklist & { rawContent: string });

export const readListsRecursively = async (
  dir: string,
  basePath: string = "",
  owner: string,
  allowArchived?: boolean,
  isRaw: boolean = false,
  metadataOnly: boolean = false,
  metadataCache?: Map<string, Record<string, unknown>>,
  statsCache?: Map<string, FileStatsEntry>,
): Promise<ChecklistReadResult[]> => {
  if (basePath === "") {
    statsCache = statsCache ?? new Map();
    metadataCache = metadataCache ?? new Map();
    try {
      const excludeStr = allowArchived
        ? ""
        : `-not -path "*/${ARCHIVED_DIR_NAME}/*"`;
      const statsCmd = `find "$1" -name "*.md" ${excludeStr} -printf "%p|%W@|%T@\\n"`;
      const metaCmd = metaGrep(["title", "uuid", "tags", "checklistType", "createdAt", SHARED_WITH_KEY]);
      const [statsOut, metaOut] = await Promise.all([
        boxedShell(statsCmd, [dir], { maxBuffer: 10 * 1024 * 1024 }).catch(
          () => "",
        ),
        boxedShell(metaCmd, [dir], { maxBuffer: 10 * 1024 * 1024 }).catch(
          () => "",
        ),
      ]);
      statsOut.split("\n").forEach((line) => {
        const [p, b, m] = line.split("|");
        if (p && b && m)
          statsCache!.set(p, {
            birthtime: new Date(parseFloat(b) * 1000),
            mtime: new Date(parseFloat(m) * 1000),
          });
      });
      const metaLines = metaOut.split("\n").filter(Boolean);
      if (debugCrud && metaLines.length) {
        console.warn(
          "[tags grep] sample (first 40 lines):",
          metaLines.slice(0, 40),
        );
      }
      scanFrontmatter(metaOut, metadataCache!);
    } catch (e) {
      console.warn("Optimization failed, falling back to standard mode", e);
    }
  }

  const entries = await serverReadDir(dir);
  let excludedDirs = EXCLUDED_DIRS;
  if (!allowArchived) {
    excludedDirs = [...EXCLUDED_DIRS, ARCHIVED_DIR_NAME];
  }
  const order = await readOrderFile(dir);
  const dirNames = entries
    .filter((e) => e.isDirectory() && !excludedDirs.includes(e.name))
    .map((e) => e.name);

  const sortedDirNames = dirNames.sort((a, b) => a.localeCompare(b));
  const dirUuidMap = order?.categories
    ? await dirUuids(dir, sortedDirNames)
    : new Map<string, string>();

  const orderedDirNames: string[] = orderByUuids(
    sortedDirNames,
    order?.categories,
    (name) => dirUuidMap.get(name),
  );

  const categoryPromises = orderedDirNames.map(async (dirName) => {
    const categoryPath = basePath ? `${basePath}/${dirName}` : dirName;
    const categoryDir = path.join(dir, dirName);
    const files = await serverReadDir(categoryDir);
    const mdFiles = files.filter((f) => f.isFile() && f.name.endsWith(".md"));
    const categoryOrder = await readOrderFile(categoryDir);
    const orderedIds: string[] = mdFiles
      .map((f) => path.basename(f.name, ".md"))
      .sort((a, b) => a.localeCompare(b));

    const filePromises = orderedIds.map(
      async (id): Promise<ChecklistReadResult | null> => {
        const fileName = `${id}.md`;
        const filePath = path.join(categoryDir, fileName);
        try {
          const cachedStats = statsCache?.get(filePath);
          const stats = cachedStats
            ? {
                birthtime: cachedStats.birthtime,
                mtime: cachedStats.mtime,
              }
            : await fs.stat(filePath);

          if (metadataOnly) {
            const metadata =
              metadataCache?.get(filePath) ??
              (await grepExtractFrontmatter(filePath));
            const tags = Array.isArray(metadata?.tags)
              ? (metadata.tags as string[])
              : [];
            return {
              id,
              uuid:
                typeof metadata?.uuid === "string"
                  ? metadata.uuid
                  : await stampUuid(filePath),
              title: await titleFromFile(metadata, filePath, id),
              type: isKanbanType(metadata?.checklistType as string)
                ? "kanban"
                : "simple",
              category: categoryPath,
              items: [],
              createdAt: createdAtOf(metadata, stats.birthtime),
              updatedAt: toIso(stats.mtime),
              owner,
              isShared: false,
              sharedWith: metadata?.sharedWith as string | string[] | undefined,
              tags,
            };
          }
          const content = await serverReadFile(filePath);
          if (isRaw) {
            const { metadata } = extractYamlMetadata(content);
            const type = getChecklistType(content);
            const uuid =
              metadata.uuid || (await stampUuid(filePath)) || generateUuid();
            return {
              id,
              title: id,
              uuid,
              type,
              category: categoryPath,
              items: [],
              createdAt: createdAtOf(metadata, stats.birthtime),
              updatedAt: toIso(stats.mtime),
              owner,
              isShared: false,
              sharedWith: metadata.sharedWith as string | string[] | undefined,
              rawContent: content,
            };
          }
          const list = parseMarkdown(
            content,
            id,
            categoryPath,
            owner,
            false,
            {
              birthtime: new Date(toIso(stats.birthtime)),
              mtime: new Date(toIso(stats.mtime)),
            },
            fileName,
          );
          if (!lacksUuid(content)) return list;
          return { ...list, uuid: (await stampUuid(filePath)) || list.uuid };
        } catch {
          return null;
        }
      },
    );

    const [currentFiles, subLists] = await Promise.all([
      Promise.all(filePromises),
      readListsRecursively(
        categoryDir,
        categoryPath,
        owner,
        allowArchived,
        isRaw,
        metadataOnly,
        metadataCache,
        statsCache,
      ),
    ]);
    return [
      ...orderByUuids(
        currentFiles.filter((n): n is ChecklistReadResult => n != null),
        categoryOrder?.items,
        (list) => list.uuid,
      ),
      ...subLists,
    ];
  });

  const results = await Promise.all(categoryPromises);
  return results.flat();
};
