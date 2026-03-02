"use server";

import fs from "fs/promises";
import { join } from "path";

export const createMigrationCompleteFile = async (): Promise<void> => {
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

export const hasMarkdownFiles = async (dirPath: string): Promise<boolean> => {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = join(dirPath, item.name);

      if (item.isDirectory()) {
        if (await hasMarkdownFiles(itemPath)) {
          return true;
        }
      } else if (item.name.endsWith(".md")) {
        return true;
      }
    }

    return false;
  } catch (error) {
    return true;
  }
};

export const isChecklistFile = async (filePath: string): Promise<boolean> => {
  return filePath.includes("/checklists/");
};

export const compareVersions = async (version1: string, version2: string): Promise<number> => {
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
