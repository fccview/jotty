"use server";

import { join, dirname } from "path";
import { Result, LinkIndex } from "@/app/_types";
import fs from "fs/promises";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";

export const findIndexFiles = async (dataDir: string): Promise<string[]> => {
  const indexFiles: string[] = [];

  const findIndexFilesRecursive = async (dirPath: string): Promise<void> => {
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = join(dirPath, item.name);

      if (item.isDirectory()) {
        if (!["temp_exports", "backups"].includes(item.name)) {
          await findIndexFilesRecursive(fullPath);
        }
      } else if (item.isFile() && item.name === ".index.json") {
        indexFiles.push(fullPath);
      }
    }
  };

  await findIndexFilesRecursive(dataDir);
  return indexFiles;
};

export const migrateIndexFile = async (
  indexPath: string
): Promise<Result<boolean>> => {
  try {
    const indexContent = await fs.readFile(indexPath, "utf-8");
    const oldIndex: LinkIndex = JSON.parse(indexContent);

    const sampleKey =
      Object.keys(oldIndex.notes || {})[0] ||
      Object.keys(oldIndex.checklists || {})[0];
    if (sampleKey && !sampleKey.includes("/") && !sampleKey.includes("%2F")) {
      return { success: true, data: true };
    }

    const newIndex: LinkIndex = { notes: {}, checklists: {} };
    const pathToUuidMap = new Map<string, string>();

    const getUuidForPath = async (
      pathKey: string,
      isChecklist: boolean
    ): Promise<string | null> => {
      const relativePath = pathKey.replace(/%20/g, " ");
      const userDir = dirname(indexPath);

      const mdPath = join(userDir, relativePath + ".md");

      try {
        const content = await fs.readFile(mdPath, "utf-8");
        const { metadata } = extractYamlMetadata(content);
        return metadata.uuid || null;
      } catch (error) {
        console.warn(`Could not read file for path ${pathKey}: ${mdPath}`);
        return null;
      }
    };

    for (const [pathKey, itemData] of Object.entries(oldIndex.notes || {})) {
      const uuid = await getUuidForPath(pathKey, false);

      if (uuid) {
        pathToUuidMap.set(pathKey, uuid);
        newIndex.notes[uuid] = {
          isLinkedTo: { notes: [], checklists: [] },
          isReferencedIn: { notes: [], checklists: [] },
        };
      } else {
        console.warn(`Skipping note entry for missing file: ${pathKey}`);
      }
    }

    for (const [pathKey, itemData] of Object.entries(
      oldIndex.checklists || {}
    )) {
      const uuid = await getUuidForPath(pathKey, true);

      if (uuid) {
        pathToUuidMap.set(pathKey, uuid);
        newIndex.checklists[uuid] = {
          isLinkedTo: { notes: [], checklists: [] },
          isReferencedIn: { notes: [], checklists: [] },
        };
      } else {
        console.warn(`Skipping checklist entry for missing file: ${pathKey}`);
      }
    }

    for (const [pathKey, itemData] of Object.entries(oldIndex.notes || {})) {
      const uuid = pathToUuidMap.get(pathKey);
      if (!uuid) continue;

      newIndex.notes[uuid].isLinkedTo = {
        notes: itemData.isLinkedTo.notes
          .map((path) => pathToUuidMap.get(path))
          .filter(Boolean) as string[],
        checklists: itemData.isLinkedTo.checklists
          .map((path) => pathToUuidMap.get(path))
          .filter(Boolean) as string[],
      };

      newIndex.notes[uuid].isReferencedIn = {
        notes: itemData.isReferencedIn.notes
          .map((path) => pathToUuidMap.get(path))
          .filter(Boolean) as string[],
        checklists: itemData.isReferencedIn.checklists
          .map((path) => pathToUuidMap.get(path))
          .filter(Boolean) as string[],
      };
    }

    for (const [pathKey, itemData] of Object.entries(
      oldIndex.checklists || {}
    )) {
      const uuid = pathToUuidMap.get(pathKey);
      if (!uuid) continue;

      newIndex.checklists[uuid].isLinkedTo = {
        notes: itemData.isLinkedTo.notes
          .map((path) => pathToUuidMap.get(path))
          .filter(Boolean) as string[],
        checklists: itemData.isLinkedTo.checklists
          .map((path) => pathToUuidMap.get(path))
          .filter(Boolean) as string[],
      };

      newIndex.checklists[uuid].isReferencedIn = {
        notes: itemData.isReferencedIn.notes
          .map((path) => pathToUuidMap.get(path))
          .filter(Boolean) as string[],
        checklists: itemData.isReferencedIn.checklists
          .map((path) => pathToUuidMap.get(path))
          .filter(Boolean) as string[],
      };
    }

    await fs.writeFile(indexPath, JSON.stringify(newIndex, null, 2), "utf-8");

    return { success: true, data: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to migrate index file",
    };
  }
};
