"use server";

import { join } from "path";
import { existsSync } from "fs";
import { Result } from "@/app/_types";
import fs from "fs/promises";
import { SHARED_ITEMS_FILE } from "@/app/_consts/files";
import { encodeCategoryPath } from "@/app/_utils/global-utils";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";

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
    const SHARING_DIR = join(process.cwd(), "data", ".sharing");
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

export const findSharingFiles = async (dataDir: string): Promise<string[]> => {
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

export const migrateSharingFile = async (
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
