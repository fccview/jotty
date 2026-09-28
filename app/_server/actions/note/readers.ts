import path from "path";
import fs from "fs/promises";
import { ARCHIVED_DIR_NAME, EXCLUDED_DIRS } from "@/app/_consts/files";
import {
  serverReadDir,
  serverReadFile,
  readOrderFile,
} from "@/app/_server/actions/file";
import {
  createdAtOf,
  extractYamlMetadata,
  generateUuid,
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
import { lacksUuid, stampUuid } from "@/app/_server/actions/lib/stamp-uuid";
import { titleFromFile } from "@/app/_server/actions/lib/file-title";
import { SHARED_WITH_KEY } from "@/app/_consts/sharing";
import { metaGrep, scanFrontmatter } from "@/app/_utils/frontmatter-scan";

export const readNotesRecursively = async (
  dir: string,
  basePath: string = "",
  owner: string,
  allowArchived: boolean = false,
  isRaw: boolean = false,
  metadataOnly: boolean = false,
  excerptLength?: number,
  metadataCache?: Map<string, Record<string, unknown>>,
  statsCache?: Map<string, FileStatsEntry>,
): Promise<Note[]> => {
  if (basePath === "") {
    statsCache = statsCache || new Map();
    metadataCache = metadataCache || new Map();

    try {
      const excludeStr = allowArchived
        ? ""
        : `-not -path "*/${ARCHIVED_DIR_NAME}/*"`;
      const statsCmd = `find "$1" -name "*.md" ${excludeStr} -printf "%p|%W@|%T@\\n"`;
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
        const [p, b, m] = line.split("|");
        if (p && b && m)
          statsCache!.set(p, {
            birthtime: new Date(parseFloat(b) * 1000),
            mtime: new Date(parseFloat(m) * 1000),
          });
      });

      scanFrontmatter(metaOut, metadataCache!);
    } catch (e) {
      console.warn("Optimization failed, falling back to standard mode", e);
    }
  }

  const notes: Note[] = [];
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

  const subDirPromises = orderedDirNames.map(async (dirName) => {
    return readNotesRecursively(
      path.join(dir, dirName),
      basePath ? `${basePath}/${dirName}` : dirName,
      owner,
      allowArchived,
      isRaw,
      metadataOnly,
      excerptLength,
      metadataCache,
      statsCache,
    );
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
        ? { birthtime: cachedStats.birthtime, mtime: cachedStats.mtime }
        : await fs.stat(filePath);

      if (metadataOnly) {
        const metadata =
          metadataCache?.get(filePath) ??
          (await grepExtractFrontmatter(filePath));

        const tags = Array.isArray(metadata?.tags)
          ? (metadata.tags as string[])
          : [];

        const uuid =
          typeof metadata?.uuid === "string"
            ? metadata.uuid
            : await stampUuid(filePath);

        if (!uuid) {
          console.warn("Skipping note without a resolvable uuid:", filePath);
          return null;
        }

        return {
          id,
          uuid,
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

        const uuid =
          typeof metadata?.uuid === "string"
            ? metadata.uuid
            : await stampUuid(filePath);

        if (!uuid) {
          console.warn("Skipping note without a resolvable uuid:", filePath);
          return null;
        }

        return {
          id,
          uuid,
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
        const content = await serverReadFile(filePath);
        if (isRaw) {
          const { metadata } = extractYamlMetadata(content);
          const uuid =
            metadata.uuid || (await stampUuid(filePath)) || generateUuid();
          return {
            id,
            uuid,
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
          if (!lacksUuid(content)) return note;
          return { ...note, uuid: (await stampUuid(filePath)) || note.uuid };
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
      currentDirNotes.filter((n): n is Note => n != null),
      order?.items,
      (note) => note.uuid,
    ),
  );
  subDirNotes.forEach((sub) => notes.push(...sub));

  return notes;
};
