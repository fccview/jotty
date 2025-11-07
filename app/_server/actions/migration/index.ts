"use server";

import { rename, rmdir } from "fs/promises";
import { join, dirname } from "path";
import { existsSync, readdirSync, statSync } from "fs";
import { Result } from "@/app/_types";
import { DEPRECATED_DOCS_FOLDER, NOTES_FOLDER } from "@/app/_consts/notes";
import fs from "fs/promises";
import { SHARING_DIR, SHARED_ITEMS_FILE } from "@/app/_consts/files";
import { encodeCategoryPath } from "@/app/_utils/global-utils";
import { exportAllChecklistsNotes, exportWholeDataFolder } from "../export";
import {
  migrateToYamlMetadata,
  hasYamlMetadata,
  extractYamlMetadata,
} from "@/app/_utils/yaml-metadata-utils";
import { readPackageVersion } from "../config";
import { LinkIndex } from "../link";

/**
 * Creates a migration completion file to prevent future migration triggers
 */
const createMigrationCompleteFile = async (): Promise<void> => {
  try {
    const migrationFile = join(process.cwd(), "data", ".migration");
    const migrationData = {
      "1.11.0": true,
    };

    await fs.writeFile(
      migrationFile,
      JSON.stringify(migrationData, null, 2),
      "utf-8"
    );
  } catch (error) {
    console.warn("Failed to create migration complete file:", error);
  }
};

const hasMarkdownFiles = (dirPath: string): boolean => {
  try {
    const items = readdirSync(dirPath);

    for (const item of items) {
      const itemPath = join(dirPath, item);
      const stat = statSync(itemPath);

      if (stat.isDirectory()) {
        if (hasMarkdownFiles(itemPath)) {
          return true;
        }
      } else if (item.endsWith(".md")) {
        return true;
      }
    }

    return false;
  } catch (error) {
    return true;
  }
};

export const renameDocsFolder = async (): Promise<Result<null>> => {
  try {
    const dataDir = join(process.cwd(), "data");
    const docsPath = join(dataDir, DEPRECATED_DOCS_FOLDER);
    const notesPath = join(dataDir, NOTES_FOLDER);

    if (!existsSync(docsPath)) {
      return { success: false, error: "Docs folder not found" };
    }

    if (existsSync(notesPath)) {
      try {
        if (hasMarkdownFiles(notesPath)) {
          return {
            success: false,
            error: "Notes folder already exists with markdown files",
          };
        } else {
          await rmdir(notesPath, { recursive: true });
        }
      } catch (error) {
        return { success: false, error: "Cannot access notes folder" };
      }
    }

    await rename(docsPath, notesPath);

    return { success: true };
  } catch (error) {
    console.error("Error renaming docs folder:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to rename folder",
    };
  }
};

interface OldSharedItem {
  id: string;
  type: string;
  title: string;
  owner: string;
  sharedWith: string[];
  sharedAt: string;
  category: string;
  filePath: string;
  isPubliclyShared: boolean;
}

interface OldSharedItemsData {
  checklists: Record<string, OldSharedItem>;
  notes: Record<string, OldSharedItem>;
}

interface NewSharedItem {
  id: string;
  category: string;
  sharer: string;
  permissions: {
    canRead: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
}

interface NewSharingData {
  [username: string]: NewSharedItem[];
}

export const migrateToNewSharingFormat = async (): Promise<
  Result<{
    migrated: boolean;
    changes: string[];
  }>
> => {
  try {
    let metadata: OldSharedItemsData;

    if (!existsSync(SHARED_ITEMS_FILE)) {
      return {
        success: true,
        data: {
          migrated: false,
          changes: ["No shared-items.json file found - nothing to migrate"],
        },
      };
    }

    try {
      const content = await fs.readFile(SHARED_ITEMS_FILE, "utf-8");
      if (!content.trim()) {
        const backupPath = `${SHARED_ITEMS_FILE}.backup`;
        await fs.copyFile(SHARED_ITEMS_FILE, backupPath);
        await fs.unlink(SHARED_ITEMS_FILE);
        return {
          success: true,
          data: {
            migrated: true,
            changes: [
              `Backed up empty shared-items.json to ${backupPath}`,
              "Removed deprecated shared-items.json file",
            ],
          },
        };
      }
      metadata = JSON.parse(content);
    } catch (error) {
      const backupPath = `${SHARED_ITEMS_FILE}.backup`;
      await fs.copyFile(SHARED_ITEMS_FILE, backupPath);
      await fs.unlink(SHARED_ITEMS_FILE);
      return {
        success: true,
        data: {
          migrated: true,
          changes: [
            `Backed up invalid shared-items.json to ${backupPath}`,
            "Removed deprecated shared-items.json file",
          ],
        },
      };
    }

    const changes: string[] = [];
    let totalMigrations = 0;

    const notesSharingData: NewSharingData = {};
    if (metadata.notes) {
      for (const [itemKey, item] of Object.entries(metadata.notes)) {
        const encodedCategory = encodeCategoryPath(item.category);

        for (const username of item.sharedWith) {
          if (!notesSharingData[username]) {
            notesSharingData[username] = [];
          }
          notesSharingData[username].push({
            id: item.id,
            category: encodedCategory,
            sharer: item.owner,
            permissions: { canRead: true, canEdit: true, canDelete: true },
          });
        }

        if (item.isPubliclyShared) {
          if (!notesSharingData.public) {
            notesSharingData.public = [];
          }
          notesSharingData.public.push({
            id: item.id,
            category: encodedCategory,
            sharer: item.owner,
            permissions: { canRead: true, canEdit: true, canDelete: true },
          });
        }

        totalMigrations++;
      }
    }

    const checklistsSharingData: NewSharingData = {};
    if (metadata.checklists) {
      for (const [itemKey, item] of Object.entries(metadata.checklists)) {
        const encodedCategory = encodeCategoryPath(item.category);

        for (const username of item.sharedWith) {
          if (!checklistsSharingData[username]) {
            checklistsSharingData[username] = [];
          }
          checklistsSharingData[username].push({
            id: item.id,
            category: encodedCategory,
            sharer: item.owner,
            permissions: { canRead: true, canEdit: true, canDelete: true },
          });
        }

        if (item.isPubliclyShared) {
          if (!checklistsSharingData.public) {
            checklistsSharingData.public = [];
          }
          checklistsSharingData.public.push({
            id: item.id,
            category: encodedCategory,
            sharer: item.owner,
            permissions: { canRead: true, canEdit: true, canDelete: true },
          });
        }

        totalMigrations++;
      }
    }

    const notesSharingPath = join(
      process.cwd(),
      "data",
      "notes",
      ".sharing.json"
    );
    const checklistsSharingPath = join(
      process.cwd(),
      "data",
      "checklists",
      ".sharing.json"
    );

    if (Object.keys(notesSharingData).length > 0) {
      await fs.mkdir(join(process.cwd(), "data", "notes"), { recursive: true });
      await fs.writeFile(
        notesSharingPath,
        JSON.stringify(notesSharingData, null, 2)
      );
      changes.push(
        `Created notes sharing file with ${Object.keys(notesSharingData).length
        } user entries`
      );
    }

    if (Object.keys(checklistsSharingData).length > 0) {
      await fs.mkdir(join(process.cwd(), "data", "checklists"), {
        recursive: true,
      });
      await fs.writeFile(
        checklistsSharingPath,
        JSON.stringify(checklistsSharingData, null, 2)
      );
      changes.push(
        `Created checklists sharing file with ${Object.keys(checklistsSharingData).length
        } user entries`
      );
    }

    const backupPath = `${SHARED_ITEMS_FILE}.backup`;
    await fs.copyFile(SHARED_ITEMS_FILE, backupPath);
    changes.push(`Backed up old shared-items.json to ${backupPath}`);

    await fs.unlink(SHARED_ITEMS_FILE);
    changes.push("Removed deprecated shared-items.json file");

    return {
      success: true,
      data: {
        migrated: true,
        changes,
      },
    };
  } catch (error) {
    console.error("Error migrating to new sharing format:", error);
    return {
      success: false,
      error: "Failed to migrate to new sharing format",
    };
  }
};

export const migrateSharingMetadata = async (): Promise<
  Result<{
    migrated: boolean;
    changes: string[];
  }>
> => {
  try {
    await fs.mkdir(SHARING_DIR, { recursive: true });

    let metadata: any;
    let changes: string[] = [];

    try {
      const content = await fs.readFile(SHARED_ITEMS_FILE, "utf-8");
      metadata = JSON.parse(content);
    } catch (error) {
      return {
        success: true,
        data: {
          migrated: false,
          changes: ["No existing sharing metadata found - nothing to migrate"],
        },
      };
    }

    let needsMigration = false;

    if (metadata.documents !== undefined && metadata.notes === undefined) {
      metadata.notes = metadata.documents;
      delete metadata.documents;
      needsMigration = true;
      changes.push("Renamed 'documents' key to 'notes'");
    }

    if (metadata.checklists === undefined) {
      metadata.checklists = {};
      needsMigration = true;
      changes.push("Added missing 'checklists' key");
    }

    if (metadata.notes === undefined) {
      metadata.notes = {};
      needsMigration = true;
      changes.push("Added missing 'notes' key");
    }

    if (needsMigration) {
      await fs.writeFile(SHARED_ITEMS_FILE, JSON.stringify(metadata, null, 2));
      changes.push("Updated sharing metadata file");
    }

    return {
      success: true,
      data: {
        migrated: needsMigration,
        changes,
      },
    };
  } catch (error) {
    console.error("Error migrating sharing metadata:", error);
    return {
      success: false,
      error: "Failed to migrate sharing metadata",
    };
  }
};

/**
 * Migrates existing documents to use YAML metadata format for titles and checklist types
 * @returns Migration result with success status and changes made
 */
export const migrateToYamlMetadataFormat = async (): Promise<
  Result<{
    migrated: boolean;
    changes: string[];
  }>
> => {
  try {
    const changes: string[] = [];

    changes.push("Starting data backup...");
    const backupResult = await exportWholeDataFolder();
    if (!backupResult.success) {
      return {
        success: false,
        error: `Failed to backup data: ${backupResult.error}`,
      };
    }
    changes.push("Data backup completed successfully");

    const dataDir = join(process.cwd(), "data");
    const allMarkdownFiles: string[] = [];

    const findMarkdownFiles = async (dirPath: string): Promise<void> => {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = join(dirPath, item.name);

        if (item.isDirectory()) {
          if (!["temp_exports", "backups"].includes(item.name)) {
            await findMarkdownFiles(fullPath);
          }
        } else if (item.isFile() && item.name.endsWith(".md")) {
          allMarkdownFiles.push(fullPath);
        }
      }
    };

    await findMarkdownFiles(dataDir);
    changes.push(`Found ${allMarkdownFiles.length} markdown files to process`);

    let processedCount = 0;
    let migratedCount = 0;

    for (const filePath of allMarkdownFiles) {
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const isChecklist = isChecklistFile(filePath);

        const migratedContent = migrateToYamlMetadata(
          content,
          true,
          isChecklist
        );

        await fs.writeFile(filePath, migratedContent, "utf-8");

        migratedCount++;
        processedCount++;
      } catch (error) {
        console.warn(`Failed to process file ${filePath}:`, error);
      }
    }

    changes.push(
      `Processed ${processedCount} files to use YAML metadata format`
    );

    changes.push("Starting index file processing...");
    try {
      const indexPaths = await findIndexFiles(dataDir);
      changes.push(`Found ${indexPaths.length} index files to process`);
      let indexProcessedCount = 0;

      for (const indexPath of indexPaths) {
        const result = await migrateIndexFile(indexPath);
        if (result.success) {
          indexProcessedCount++;
          changes.push(`Processed index file: ${indexPath}`);
        } else {
          changes.push(
            `Failed to process index file: ${indexPath} - ${result.error}`
          );
        }
      }

      changes.push(`Processed ${indexProcessedCount} index files`);
    } catch (error) {
      changes.push(
        `Failed to process index files: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    changes.push("Starting sharing data migration...");
    try {
      const sharingPaths = await findSharingFiles(dataDir);
      changes.push(`Found ${sharingPaths.length} sharing files to process`);
      let sharingProcessedCount = 0;

      for (const sharingPath of sharingPaths) {
        const result = await migrateSharingFile(sharingPath);
        if (result.success) {
          sharingProcessedCount++;
          changes.push(`Migrated sharing file: ${sharingPath}`);
        } else {
          changes.push(
            `Failed to migrate sharing file: ${sharingPath} - ${result.error}`
          );
        }
      }

      changes.push(`Processed ${sharingProcessedCount} sharing files`);
    } catch (error) {
      changes.push(
        `Failed to process sharing files: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    await createMigrationCompleteFile();
    changes.push("Created migration completion file");

    return {
      success: true,
      data: {
        migrated: true,
        changes,
      },
    };
  } catch (error) {
    console.error("Error migrating to YAML metadata format:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to migrate to YAML metadata format",
    };
  }
};

/**
 * Checks if a file path is for a checklist
 * @param filePath - The file path to check
 * @returns True if it's a checklist file
 */
const isChecklistFile = (filePath: string): boolean => {
  return filePath.includes("/checklists/");
};

/**
 * Finds all .index.json files in the data directory
 * @param dataDir - The data directory path
 * @returns Array of paths to index files
 */
const findIndexFiles = async (dataDir: string): Promise<string[]> => {
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

/**
 * Migrates a single index file from path-based to UUID-based structure
 * @param indexPath - Path to the index file
 * @returns Migration result
 */
const migrateIndexFile = async (
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

/**
 * Finds all .sharing.json files in the data directory
 * @param dataDir - The data directory path
 * @returns Array of paths to sharing files
 */
const findSharingFiles = async (dataDir: string): Promise<string[]> => {
  const sharingFiles: string[] = [];

  const findSharingFilesRecursive = async (dirPath: string): Promise<void> => {
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = join(dirPath, item.name);

      if (item.isDirectory()) {
        if (!["temp_exports", "backups"].includes(item.name)) {
          await findSharingFilesRecursive(fullPath);
        }
      } else if (item.isFile() && item.name === ".sharing.json") {
        sharingFiles.push(fullPath);
      }
    }
  };

  await findSharingFilesRecursive(dataDir);
  return sharingFiles;
};

/**
 * Migrates a single sharing file from id+category format to UUID-based format
 * @param sharingPath - Path to the sharing file
 * @returns Migration result
 */
const migrateSharingFile = async (
  sharingPath: string
): Promise<Result<boolean>> => {
  try {
    const sharingContent = await fs.readFile(sharingPath, "utf-8");
    const oldSharingData: Record<string, any[]> = JSON.parse(sharingContent);

    let needsMigration = false;
    for (const userShares of Object.values(oldSharingData)) {
      for (const entry of userShares) {
        if (!entry.uuid && (entry.id || entry.category)) {
          needsMigration = true;
          break;
        }
      }
      if (needsMigration) break;
    }

    if (!needsMigration) {
      return { success: true, data: true };
    }

    const newSharingData: Record<string, any[]> = {};

    const getUuidForItem = async (
      itemId: string,
      category: string,
      sharer: string,
      isChecklist: boolean
    ): Promise<string | null> => {
      const dataDir = join(process.cwd(), "data");
      const modeDir = isChecklist ? "checklists" : "notes";
      const userDir = join(dataDir, modeDir, sharer);
      const decodedCategory = decodeURIComponent(category.replace(/%20/g, " "));
      const categoryDir = join(userDir, decodedCategory);
      const filePath = join(categoryDir, `${itemId}.md`);

      try {
        const content = await fs.readFile(filePath, "utf-8");
        const { metadata } = extractYamlMetadata(content);
        return metadata.uuid || null;
      } catch (error) {
        console.warn(
          `Could not read file for sharing entry ${itemId} in ${category} (sharer: ${sharer}): ${filePath}`
        );
        return null;
      }
    };

    for (const [username, userShares] of Object.entries(oldSharingData)) {
      newSharingData[username] = [];

      for (const entry of userShares) {
        if (entry.uuid) {
          newSharingData[username].push(entry);
          continue;
        }

        const isChecklist = sharingPath.includes("checklists");
        const uuid = await getUuidForItem(
          entry.id,
          entry.category,
          entry.sharer,
          isChecklist
        );

        if (uuid) {
          newSharingData[username].push({
            uuid,
            id: entry.id,
            category: entry.category,
            sharer: entry.sharer,
            permissions: entry.permissions,
          });
        } else {
          console.warn(
            `Skipping sharing entry for missing file: ${entry.id} in ${entry.category}`
          );
        }
      }

      if (newSharingData[username].length === 0) {
        delete newSharingData[username];
      }
    }

    await fs.writeFile(
      sharingPath,
      JSON.stringify(newSharingData, null, 2),
      "utf-8"
    );

    return { success: true, data: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to migrate sharing file",
    };
  }
};

/**
 * Compares two semantic version strings
 * @param version1 - First version string
 * @param version2 - Second version string
 * @returns 1 if version1 > version2, -1 if version1 < version2, 0 if equal
 */
const compareVersions = (version1: string, version2: string): number => {
  const v1Parts = version1.split(".").map(Number);
  const v2Parts = version2.split(".").map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;

    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }

  return 0;
};
