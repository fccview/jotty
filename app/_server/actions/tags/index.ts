"use server";

import { join } from "path";
import fs from "fs/promises";
import { Result } from "@/app/_types";
import { exportWholeDataFolder } from "../export";
import { extractHashtagsFromContent } from "@/app/_utils/tag-utils";
import {
  extractYamlMetadata,
  updateYamlMetadata,
} from "@/app/_utils/yaml-metadata-utils";

const findMarkdownFiles = async (dirPath: string): Promise<string[]> => {
  const markdownFiles: string[] = [];

  const findRecursive = async (currentPath: string): Promise<void> => {
    try {
      const items = await fs.readdir(currentPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = join(currentPath, item.name);

        if (item.isDirectory()) {
          if (!["temp_exports", "backups"].includes(item.name)) {
            await findRecursive(fullPath);
          }
        } else if (item.isFile() && item.name.endsWith(".md")) {
          markdownFiles.push(fullPath);
        }
      }
    } catch {
      // Ignore directories we can't access
    }
  };

  await findRecursive(dirPath);
  return markdownFiles;
};

export const updateTagsFromContent = async (): Promise<
  Result<{
    processed: number;
    updated: number;
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

    const notesDir = join(process.cwd(), "data", "notes");

    try {
      await fs.access(notesDir);
    } catch {
      return {
        success: false,
        error: "Notes directory not found",
      };
    }

    const markdownFiles = await findMarkdownFiles(notesDir);
    changes.push(`Found ${markdownFiles.length} markdown files to process`);

    let processedCount = 0;
    let updatedCount = 0;

    for (const filePath of markdownFiles) {
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const { metadata, contentWithoutMetadata } = extractYamlMetadata(content);

        const existingTags = metadata.tags || [];
        const contentTags = extractHashtagsFromContent(contentWithoutMetadata);

        const mergedTags = Array.from(new Set([...existingTags, ...contentTags]));
        mergedTags.sort();

        const tagsChanged =
          mergedTags.length !== existingTags.length ||
          !mergedTags.every((tag, i) => tag === existingTags.sort()[i]);

        if (tagsChanged && mergedTags.length > 0) {
          const updatedContent = updateYamlMetadata(
            content,
            { tags: mergedTags },
            true
          );
          await fs.writeFile(filePath, updatedContent, "utf-8");
          updatedCount++;
        }

        processedCount++;
      } catch (error) {
        changes.push(`Failed to process: ${filePath}`);
      }
    }

    changes.push(`Processed ${processedCount} files`);
    changes.push(`Updated ${updatedCount} files with new tags`);

    return {
      success: true,
      data: {
        processed: processedCount,
        updated: updatedCount,
        changes,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update tags",
    };
  }
};
