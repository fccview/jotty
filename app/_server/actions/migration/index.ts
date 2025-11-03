"use server";

import { rename, rmdir } from "fs/promises";
import { join } from "path";
import { existsSync, readdirSync, statSync } from "fs";
import { Result } from "@/app/_types";
import { DEPRECATED_DOCS_FOLDER, NOTES_FOLDER } from "@/app/_consts/notes";
import fs from "fs/promises";
import { SHARING_DIR, SHARED_ITEMS_FILE } from "@/app/_consts/files";
import { encodeCategoryPath } from "@/app/_utils/global-utils";

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

    try {
      const content = await fs.readFile(SHARED_ITEMS_FILE, "utf-8");
      metadata = JSON.parse(content);
    } catch (error) {
      return {
        success: true,
        data: {
          migrated: false,
          changes: ["No shared-items.json file found - nothing to migrate"],
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
        `Created notes sharing file with ${
          Object.keys(notesSharingData).length
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
        `Created checklists sharing file with ${
          Object.keys(checklistsSharingData).length
        } user entries`
      );
    }

    if (totalMigrations > 0) {
      const backupPath = `${SHARED_ITEMS_FILE}.backup`;
      await fs.copyFile(SHARED_ITEMS_FILE, backupPath);
      changes.push(`Backed up old shared-items.json to ${backupPath}`);

      await fs.unlink(SHARED_ITEMS_FILE);
      changes.push("Removed deprecated shared-items.json file");
    }

    return {
      success: true,
      data: {
        migrated: totalMigrations > 0,
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
