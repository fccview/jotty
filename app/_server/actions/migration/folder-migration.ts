"use server";

import { rename, rmdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { Result } from "@/app/_types";
import { DEPRECATED_DOCS_FOLDER, NOTES_FOLDER } from "@/app/_consts/notes";
import { hasMarkdownFiles } from "./helpers";

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
        if (await hasMarkdownFiles(notesPath)) {
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
