"use server";

import { join } from "path";
import { Result } from "@/app/_types";
import fs from "fs/promises";
import { migrateToYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { exportWholeDataFolder } from "../export";
import { isChecklistFile, createMigrationCompleteFile } from "./helpers";
import { findIndexFiles, migrateIndexFile } from "./index-migration";
import { findSharingFiles, migrateSharingFile } from "./sharing-migration";

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
        const isChecklist = await isChecklistFile(filePath);

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
