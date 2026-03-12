"use server";

import path from "path";
import fs from "fs/promises";
import { promisify } from "util";
import { exec } from "child_process";
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
  extractYamlMetadata,
  generateUuid,
  toIso,
  updateYamlMetadata,
} from "@/app/_utils/yaml-metadata-utils";
import { grepExtractFrontmatter } from "@/app/_utils/grep-utils";
import type { FileStatsEntry } from "@/app/_server/actions/file";
import { getChecklistType } from "./parsers";
import { isDebugFlag } from "@/app/_utils/env-utils";

const execAsync = promisify(exec);

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
      const statsCmd = `find "${dir}" -name "*.md" ${excludeStr} -printf "%p|%W@|%T@\\n"`;
      const metaCmd = `grep -rE "^(title|uuid|tags|checklistType):|^[[:space:]]+- |^---$" "${dir}"`;
      const [statsOut, metaOut] = await Promise.all([
        execAsync(statsCmd, { maxBuffer: 10 * 1024 * 1024 }).catch(() => ({
          stdout: "",
        })),
        execAsync(metaCmd, { maxBuffer: 10 * 1024 * 1024 }).catch(() => ({
          stdout: "",
        })),
      ]);
      statsOut.stdout.split("\n").forEach((line) => {
        const [p, b, m] = line.split("|");
        if (p && b && m)
          statsCache!.set(p, {
            birthtime: new Date(parseFloat(b) * 1000),
            mtime: new Date(parseFloat(m) * 1000),
          });
      });
      const metaLines = metaOut.stdout.split("\n").filter(Boolean);
      if (debugCrud && metaLines.length) {
        console.warn("[tags grep] sample (first 40 lines):", metaLines.slice(0, 40));
      }
      const inFrontmatter = new Map<string, boolean>();
      let inTagsFile = "";
      for (const line of metaLines) {
        const colonIdx = line.indexOf(":");
        if (colonIdx === -1) continue;
        const filePath = line.slice(0, colonIdx);
        const rest = line.slice(colonIdx + 1);
        if (rest.trim() === "---") {
          inFrontmatter.set(filePath, !inFrontmatter.get(filePath));
          if (debugCrud) console.warn("[tags grep] --- seen, filePath:", filePath, "inFrontmatter:", inFrontmatter.get(filePath));
          continue;
        }
        if (!inFrontmatter.get(filePath)) continue;
        if (/^\s+-\s/.test(rest)) {
          if (inTagsFile === filePath) {
            const tag = rest.replace(/^\s+-\s+/, "").trim();
            if (tag) {
              if (debugCrud) console.warn("[tags grep] adding tag:", JSON.stringify(tag.slice(0, 50)), "filePath:", filePath);
              if (!metadataCache!.has(filePath))
                metadataCache!.set(filePath, {});
              const entry = metadataCache!.get(filePath)!;
              if (!Array.isArray(entry.tags)) entry.tags = [];
              (entry.tags as string[]).push(tag);
            }
          }
          continue;
        }
        inTagsFile = "";
        const innerColon = rest.indexOf(":");
        if (innerColon === -1) continue;
        const key = rest.slice(0, innerColon);
        const val = rest.slice(innerColon + 1);
        if (!metadataCache!.has(filePath)) metadataCache!.set(filePath, {});
        const entry = metadataCache!.get(filePath)!;
        if (key === "tags") {
          const trimmed = val.trim();
          if (trimmed === "") {
            entry.tags = [];
            inTagsFile = filePath;
          } else {
            entry.tags = trimmed
              .replace(/^\[|\]$/g, "")
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean);
          }
        } else {
          entry[key] = val.trim().replace(/^["']|["']$/g, "");
        }
      }
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

  const orderedDirNames: string[] = order?.categories
    ? [
        ...order.categories.filter((n) => dirNames.includes(n)),
        ...dirNames
          .filter((n) => !order.categories!.includes(n))
          .sort((a, b) => a.localeCompare(b)),
      ]
    : dirNames.sort((a, b) => a.localeCompare(b));

  const categoryPromises = orderedDirNames.map(async (dirName) => {
    const categoryPath = basePath ? `${basePath}/${dirName}` : dirName;
    const categoryDir = path.join(dir, dirName);
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
                typeof metadata?.uuid === "string" ? metadata.uuid : undefined,
              title: typeof metadata?.title === "string" ? metadata.title : id,
              type:
                metadata?.checklistType === "task" || metadata?.checklistType === "kanban"
                  ? "kanban"
                  : "simple",
              category: categoryPath,
              items: [],
              createdAt: toIso(stats.birthtime),
              updatedAt: toIso(stats.mtime),
              owner,
              isShared: false,
              tags,
            };
          }
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
            return {
              id,
              title: id,
              uuid,
              type,
              category: categoryPath,
              items: [],
              createdAt: toIso(stats.birthtime),
              updatedAt: toIso(stats.mtime),
              owner,
              isShared: false,
              rawContent: content,
            };
          }
          return parseMarkdown(
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
      ...currentFiles.filter((n): n is ChecklistReadResult => n != null),
      ...subLists,
    ];
  });

  const results = await Promise.all(categoryPromises);
  return results.flat();
};
