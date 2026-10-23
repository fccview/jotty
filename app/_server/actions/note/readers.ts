import path from "path";
import fs from "fs/promises";
import { hiddenFindFilter, skippedDirs } from "@/app/_consts/files";
import {
  serverReadDir,
  serverReadFile,
  readOrderFile,
} from "@/app/_server/actions/file";
import {
  createdAtOf,
  extractYamlMetadata,
  toIso,
} from "@/app/_utils/yaml-metadata-utils";
import {
  grepExtractFrontmatter,
  grepExtractExcerpt,
} from "@/app/_utils/grep-utils";
import type { FileStatsEntry } from "@/app/_server/actions/file";
import { dirUuids } from "@/app/_server/actions/share/category-info";
import { orderByUuids } from "@/app/_utils/order-utils";
import { parseMarkdownNote } from "./parsers";
import { Note } from "@/app/_types";
import { boxedShell } from "@/app/_utils/shell-utils";
import { claimOf, claimUuid, lacksUuid } from "@/app/_server/actions/lib/stamp-uuid";
import { pathUuid } from "@/app/_server/actions/lib/read-only";
import { titleFromFile } from "@/app/_server/actions/lib/file-title";
import { SHARED_WITH_KEY } from "@/app/_consts/sharing";
import { metaGrep, scanFrontmatter } from "@/app/_utils/frontmatter-scan";
import { summarizeNote } from "@/app/_utils/note-display-utils";
import { STAT_PRINTF, parseStatLine, summaryMemo } from "@/app/_server/actions/lib/summary-memo";

export type ListedNote = Note & { sourcePath?: string };

const memo = summaryMemo<ListedNote>();

const summed = (note: Note, filePath: string): ListedNote => ({
  ...note,
  content: "",
  ...summarizeNote(note),
  sourcePath: filePath,
});

const claimedNote = async (note: Note, filePath: string): Promise<Note> => {
  const claim = await claimUuid(filePath);
  return {
    ...note,
    uuid: claim?.uuid || pathUuid(filePath),
    ...(claim?.refusal && { lockReason: claim.refusal }),
  };
};

export interface NoteReadOptions {
  basePath?: string;
  allowArchived?: boolean;
  isRaw?: boolean;
  metadataOnly?: boolean;
  excerptLength?: number;
  metadataCache?: Map<string, Record<string, unknown>>;
  statsCache?: Map<string, FileStatsEntry>;
  summarize?: boolean;
}

export const readNotesRecursively = async (
  dir: string,
  owner: string,
  options: NoteReadOptions = {},
): Promise<ListedNote[]> => {
  const {
    basePath = "",
    allowArchived = false,
    isRaw = false,
    metadataOnly = false,
    excerptLength,
    summarize = false,
  } = options;
  let { metadataCache, statsCache } = options;

  if (basePath === "") {
    statsCache = statsCache || new Map();
    metadataCache = metadataCache || new Map();

    try {
      const excludeStr = hiddenFindFilter(allowArchived);
      const statsCmd = `find "$1" -name "*.md" ${excludeStr} -printf "${STAT_PRINTF}"`;
      const metaCmd = metaGrep(["title", "uuid", "tags", "encrypted", "createdAt", SHARED_WITH_KEY]);
      const [statsOut, metaOut] = await Promise.all([
        boxedShell(statsCmd, [dir], { maxBuffer: 10 * 1024 * 1024 }).catch(
          () => "",
        ),
        boxedShell(metaCmd, [dir], { maxBuffer: 10 * 1024 * 1024 }).catch(
          () => "",
        ),
      ]);

      statsOut.split("\n").forEach((line) => {
        const parsed = parseStatLine(line);
        if (parsed) statsCache!.set(parsed[0], parsed[1]);
      });

      scanFrontmatter(metaOut, metadataCache!);
    } catch (e) {
      console.warn("Optimization failed, falling back to standard mode", e);
    }
  }

  const notes: ListedNote[] = [];
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

  const subDirPromises = orderedDirNames.map(async (dirName) => {
    return readNotesRecursively(path.join(dir, dirName), owner, {
      ...options,
      basePath: basePath ? `${basePath}/${dirName}` : dirName,
      metadataCache,
      statsCache,
    });
  });

  const categoryDir = dir;
  const categoryPath = basePath;
  const files = entries;
  const mdFiles = files.filter((f) => f.isFile() && f.name.endsWith(".md"));
  const orderedIds: string[] = mdFiles
    .map((f) => path.basename(f.name, ".md"))
    .sort((a, b) => a.localeCompare(b));

  const filePromises = orderedIds.map(async (id) => {
    const fileName = `${id}.md`;
    const filePath = path.join(categoryDir, fileName);
    try {
      const cachedStats = statsCache?.get(filePath);
      const stats = cachedStats
        ? cachedStats
        : await fs.stat(filePath);

      if (metadataOnly) {
        const metadata =
          metadataCache?.get(filePath) ??
          (await grepExtractFrontmatter(filePath));

        const tags = Array.isArray(metadata?.tags)
          ? (metadata.tags as string[])
          : [];

        const claim = await claimOf(metadata?.uuid, filePath);
        const uuid = claim?.uuid;

        if (!uuid) {
          console.warn("Skipping note without a resolvable uuid:", filePath);
          return null;
        }

        return {
          id,
          uuid,
          ...(claim?.refusal && { lockReason: claim.refusal }),
          title: await titleFromFile(metadata, filePath, id),
          category: categoryPath,
          createdAt: createdAtOf(metadata, stats.birthtime),
          updatedAt: toIso(stats.mtime),
          owner,
          isShared: false,
          sharedWith: metadata?.sharedWith as string | string[] | undefined,
          encrypted: metadata?.encrypted === true,
          tags,
        };
      } else if (excerptLength) {
        const metadata =
          metadataCache?.get(filePath) ??
          (await grepExtractFrontmatter(filePath));
        const tags = Array.isArray(metadata?.tags)
          ? (metadata.tags as string[])
          : [];
        const excerpt = await grepExtractExcerpt(filePath, excerptLength);

        const claim = await claimOf(metadata?.uuid, filePath);
        const uuid = claim?.uuid;

        if (!uuid) {
          console.warn("Skipping note without a resolvable uuid:", filePath);
          return null;
        }

        return {
          id,
          uuid,
          ...(claim?.refusal && { lockReason: claim.refusal }),
          title: await titleFromFile(metadata, filePath, id),
          content: excerpt,
          category: categoryPath,
          createdAt: createdAtOf(metadata, stats.birthtime),
          updatedAt: toIso(stats.mtime),
          owner,
          isShared: false,
          sharedWith: metadata?.sharedWith as string | string[] | undefined,
          encrypted: metadata?.encrypted === true,
          tags,
        };
      } else {
        const remembered = summarize && !isRaw ? memo.recall(filePath, stats) : undefined;
        if (remembered) return remembered;
        const content = await serverReadFile(filePath);
        if (isRaw) {
          const { metadata } = extractYamlMetadata(content);
          const claim = await claimOf(metadata.uuid, filePath);
          return {
            id,
            uuid: claim?.uuid || pathUuid(filePath),
            ...(claim?.refusal && { lockReason: claim.refusal }),
            title: id,
            content: "",
            category: categoryPath,
            createdAt: createdAtOf(metadata, stats.birthtime),
            updatedAt: toIso(stats.mtime),
            owner,
            isShared: false,
            sharedWith: metadata.sharedWith as string | string[] | undefined,
            rawContent: content,
          };
        } else {
          const note = parseMarkdownNote(
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
          if (lacksUuid(content)) {
            const claimed = await claimedNote(note, filePath);
            return summarize ? summed(claimed, filePath) : claimed;
          }
          return summarize ? memo.remember(filePath, stats, summed(note, filePath)) : note;
        }
      }
    } catch (e) {
      return null;
    }
  });

  const [subDirNotes, currentDirNotes] = await Promise.all([
    Promise.all(subDirPromises),
    Promise.all(filePromises),
  ]);

  notes.push(
    ...orderByUuids(
      currentDirNotes.filter((n): n is ListedNote => n != null),
      order?.items,
      (note) => note.uuid,
    ),
  );
  subDirNotes.forEach((sub) => notes.push(...sub));

  return notes;
};
