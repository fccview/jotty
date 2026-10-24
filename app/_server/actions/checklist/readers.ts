import path from "path";
import fs from "fs/promises";
import { Checklist } from "@/app/_types";
import { skippedDirs } from "@/app/_consts/files";
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
  toIso,
} from "@/app/_utils/yaml-metadata-utils";
import type { FileStatsEntry } from "@/app/_server/actions/file";
import { dirUuids } from "@/app/_server/actions/share/category-info";
import { orderByUuids } from "@/app/_utils/order-utils";
import { getChecklistType } from "./parsers";
import { isKanbanType } from "@/app/_types/enums";
import { claimOf, claimUuid, lacksUuid } from "@/app/_server/actions/lib/stamp-uuid";
import { pathUuid } from "@/app/_server/actions/lib/read-only";
import { titleFromFile } from "@/app/_server/actions/lib/file-title";
import { fillFrontmatters, frontmatterOf } from "@/app/_server/actions/lib/frontmatter-memo";
import { isRecurringList, summarizeList } from "@/app/_utils/browse/list-summary-utils";
import { FileStamp, summaryMemo } from "@/app/_server/actions/lib/summary-memo";
import { listingStats } from "@/app/_server/actions/lib/listing-stats";
import { listingPatcher } from "@/app/_server/actions/lib/listing-patch";


export type ChecklistReadResult =
  | Partial<Checklist>
  | Checklist
  | (Checklist & { rawContent: string });

declare global {
  var __jottyListSummaryMemo: ReturnType<typeof summaryMemo<ChecklistReadResult>> | undefined;
}

const memo = (globalThis.__jottyListSummaryMemo ??= summaryMemo<ChecklistReadResult>());

const summed = (list: Checklist): Checklist =>
  isRecurringList(list) ? list : { ...list, items: [], summary: summarizeList(list) };

const kept = (filePath: string, stats: FileStamp, list: Checklist): ChecklistReadResult =>
  list.summary ? memo.remember(filePath, stats, list) : list;

export interface ListReadOptions {
  basePath?: string;
  allowArchived?: boolean;
  isRaw?: boolean;
  metadataOnly?: boolean;
  metadataCache?: Map<string, Record<string, unknown>>;
  statsCache?: Map<string, FileStatsEntry>;
  summarize?: boolean;
}

export interface KnownListFile {
  stats?: FileStatsEntry;
  metadata?: Record<string, unknown>;
}

export const readListEntry = async (
  filePath: string,
  categoryPath: string,
  owner: string,
  options: ListReadOptions = {},
  known: KnownListFile = {},
): Promise<ChecklistReadResult | null> => {
  const { isRaw = false, metadataOnly = false, summarize = false } = options;
  const fileName = path.basename(filePath);
  const id = path.basename(fileName, ".md");
  try {
    const stats = known.stats ?? (await fs.stat(filePath));

    if (metadataOnly) {
      const metadata =
        known.metadata ?? (await frontmatterOf(filePath, stats));
      const tags = Array.isArray(metadata?.tags)
        ? (metadata.tags as string[])
        : [];
      const claim = await claimOf(metadata?.uuid, filePath);
      if (!claim) {
        console.warn("Skipping checklist without a resolvable uuid:", filePath);
        return null;
      }
      return {
        id,
        uuid: claim.uuid,
        ...(claim.refusal && { lockReason: claim.refusal }),
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
    const remembered =
      summarize && !isRaw ? memo.recall(filePath, stats) : undefined;
    if (remembered) return remembered;
    const content = await serverReadFile(filePath);
    if (isRaw) {
      const { metadata } = extractYamlMetadata(content);
      const type = getChecklistType(content);
      const claim = await claimOf(metadata.uuid, filePath);
      return {
        id,
        title: id,
        uuid: claim?.uuid || pathUuid(filePath),
        ...(claim?.refusal && { lockReason: claim.refusal }),
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
    if (!lacksUuid(content)) {
      return summarize ? kept(filePath, stats, summed(list)) : list;
    }
    const claim = await claimUuid(filePath);
    const claimed = {
      ...list,
      uuid: claim?.uuid || pathUuid(filePath),
      ...(claim?.refusal && { lockReason: claim.refusal }),
    };
    return summarize ? summed(claimed) : claimed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") console.error("Could not read checklist:", filePath, error);
    return null;
  }
};

export const readListsRecursively = async (
  dir: string,
  owner: string,
  options: ListReadOptions = {},
): Promise<ChecklistReadResult[]> => {
  const {
    basePath = "",
    allowArchived,
    isRaw = false,
    metadataOnly = false,
    summarize = false,
  } = options;
  let { metadataCache, statsCache } = options;
  if (basePath === "") {
    statsCache = statsCache ?? new Map();
    metadataCache = metadataCache ?? new Map();
    try {
      const found = await listingStats(dir, allowArchived);
      found.forEach((stat, filePath) => statsCache!.set(filePath, stat));
      await fillFrontmatters(statsCache!, metadataCache!);
    } catch (e) {
      console.warn("Optimization failed, falling back to standard mode", e);
    }
  }

  const entries = await serverReadDir(dir);
  const excludedDirs = skippedDirs(allowArchived);
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

    const filePromises = orderedIds.map((id) => {
      const filePath = path.join(categoryDir, `${id}.md`);
      return readListEntry(filePath, categoryPath, owner, options, {
        stats: statsCache?.get(filePath),
        metadata: metadataCache?.get(filePath),
      });
    });

    const [currentFiles, subLists] = await Promise.all([
      Promise.all(filePromises),
      readListsRecursively(categoryDir, owner, {
        ...options,
        basePath: categoryPath,
        metadataCache,
        statsCache,
      }),
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

export const patchListListing = (dir: string, owner: string, options: ListReadOptions = {}) =>
  listingPatcher<ChecklistReadResult>(dir, skippedDirs(options.allowArchived), (filePath, category) =>
    readListEntry(filePath, category, owner, options),
  );
