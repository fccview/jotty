"use server";

import archiver from "archiver";
import * as fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { ExportResult, ExportProgress } from "@/app/_types";
import { DATA_DIR, USERS_FILE, EXPORT_TEMP_DIR } from "@/app/_consts/files";
import { getAllLists } from "@/app/_server/actions/checklist";
import { getAllNotes } from "@/app/_server/actions/note";
import { readJsonFile, ensureDir } from "@/app/_server/actions/file";
import { User } from "@/app/_types";
import { Modes } from "@/app/_types/enums";

let exportProgress: ExportProgress = {
  progress: 0,
  message: "Starting export...",
};

const updateProgress = (progress: number, message: string) => {
  exportProgress = { progress, message };
};

export const getExportProgress = async (): Promise<ExportProgress> => {
  return exportProgress;
};

const zipDirectory = async (
  sourceDir: string,
  outPath: string,
  updateProgress: (progress: number, message: string) => void,
  excludeTempExports: boolean = false
): Promise<void> => {
  await ensureDir(path.dirname(outPath));
  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = fs.createWriteStream(outPath);

  return new Promise((resolve, reject) => {
    stream.on("close", () => {
      resolve();
    });
    archive.on("error", (err: Error) => {
      console.error("Archiver error:", err);
      reject(err);
    });

    archive.pipe(stream);

    let totalBytes = 0;

    archive.on("progress", (progress: archiver.ProgressData) => {
      totalBytes = progress.entries.total;
      const transferredBytes = progress.entries.processed;
      const currentProgress =
        totalBytes > 0 ? Math.round((transferredBytes / totalBytes) * 100) : 0;
      updateProgress(
        currentProgress,
        `Zipping files: ${transferredBytes}/${totalBytes} bytes`
      );
    });

    if (excludeTempExports) {
      archive.glob("**/*", {
        cwd: sourceDir,
        ignore: ["temp_exports/**"],
      });
    } else {
      archive.directory(sourceDir, false);
    }

    archive.finalize();
  });
};

export const exportAllChecklistsNotes = async (): Promise<ExportResult> => {
  updateProgress(0, "Preparing all checklists and notes for export...");
  try {
    const tempExportPath = path.join(
      process.cwd(),
      EXPORT_TEMP_DIR,
      `all_checklists_notes_${Date.now()}.zip`
    );
    const tempContentDir = path.join(
      process.cwd(),
      EXPORT_TEMP_DIR,
      `content_${Date.now()}`
    );
    await ensureDir(tempContentDir);

    const allListsResult = await getAllLists();
    const allNotesResult = await getAllNotes();

    if (!allListsResult.success || !allNotesResult.success) {
      throw new Error("Failed to retrieve checklists or notes.");
    }

    for (const list of allListsResult.data!) {
      const userDir = path.join(
        tempContentDir,
        Modes.CHECKLISTS,
        list.owner || "unknown_user",
        list.category || "Uncategorized"
      );
      await ensureDir(userDir);
      await fsp.writeFile(
        path.join(userDir, `${list.id}.json`),
        JSON.stringify(list, null, 2),
        "utf-8"
      );
    }

    for (const note of allNotesResult.data!) {
      const userDir = path.join(
        tempContentDir,
        Modes.NOTES,
        note.owner || "unknown_user",
        note.category || "Uncategorized"
      );
      await ensureDir(userDir);
      await fsp.writeFile(
        path.join(userDir, `${note.id}.json`),
        JSON.stringify(note, null, 2),
        "utf-8"
      );
    }

    updateProgress(50, "Compressing all checklists and notes...");
    await zipDirectory(tempContentDir, tempExportPath, updateProgress);
    await fsp.rm(tempContentDir, { recursive: true, force: true });

    updateProgress(100, "Export completed.");
    return {
      success: true,
      downloadUrl: `/api/exports/${path.basename(tempExportPath)}`,
    };
  } catch (error: any) {
    console.error("Error exporting all checklists and notes:", error);
    updateProgress(100, "Export failed.");
    return {
      success: false,
      error: error.message || "Failed to export all checklists and notes.",
    };
  }
};

export const exportUserChecklistsNotes = async (
  username: string
): Promise<ExportResult> => {
  updateProgress(
    0,
    `Preparing ${username}'s checklists and notes for export...`
  );
  try {
    const tempExportPath = path.join(
      process.cwd(),
      EXPORT_TEMP_DIR,
      `${username}_content_${Date.now()}.zip`
    );
    const tempUserContentDir = path.join(
      process.cwd(),
      EXPORT_TEMP_DIR,
      `user_content_${username}_${Date.now()}`
    );
    await ensureDir(tempUserContentDir);

    const allListsResult = await getAllLists();
    const allNotesResult = await getAllNotes();

    if (!allListsResult.success || !allNotesResult.success) {
      throw new Error("Failed to retrieve checklists or notes.");
    }

    const userLists = allListsResult.data!.filter(
      (list) => list.owner === username
    );
    const userNotes = allNotesResult.data!.filter(
      (note) => note.owner === username
    );

    for (const list of userLists) {
      const userDir = path.join(
        tempUserContentDir,
        Modes.CHECKLISTS,
        list.category || "Uncategorized"
      );
      await ensureDir(userDir);
      await fsp.writeFile(
        path.join(userDir, `${list.id}.json`),
        JSON.stringify(list, null, 2),
        "utf-8"
      );
    }

    for (const note of userNotes) {
      const userDir = path.join(
        tempUserContentDir,
        Modes.NOTES,
        note.category || "Uncategorized"
      );
      await ensureDir(userDir);
      await fsp.writeFile(
        path.join(userDir, `${note.id}.json`),
        JSON.stringify(note, null, 2),
        "utf-8"
      );
    }

    updateProgress(50, `Compressing ${username}'s checklists and notes...`);
    await zipDirectory(tempUserContentDir, tempExportPath, updateProgress);
    await fsp.rm(tempUserContentDir, { recursive: true, force: true });

    updateProgress(100, "Export completed.");
    return {
      success: true,
      downloadUrl: `/api/exports/${path.basename(tempExportPath)}`,
    };
  } catch (error: any) {
    console.error(`Error exporting ${username}'s checklists and notes:`, error);
    updateProgress(100, "Export failed.");
    return {
      success: false,
      error:
        error.message || `Failed to export ${username}'s checklists and notes.`,
    };
  }
};

export const exportAllUsersData = async (): Promise<ExportResult> => {
  updateProgress(0, "Preparing all user data for export...");
  try {
    const tempExportPath = path.join(
      process.cwd(),
      EXPORT_TEMP_DIR,
      `all_users_data_${Date.now()}.zip`
    );
    const tempUserDir = path.join(
      process.cwd(),
      EXPORT_TEMP_DIR,
      `users_data_${Date.now()}`
    );
    await ensureDir(tempUserDir);

    const users: User[] = await readJsonFile(USERS_FILE);
    await fsp.writeFile(
      path.join(tempUserDir, "users.json"),
      JSON.stringify(users, null, 2),
      "utf-8"
    );

    updateProgress(50, "Compressing all user data...");
    await zipDirectory(tempUserDir, tempExportPath, updateProgress);
    await fsp.rm(tempUserDir, { recursive: true, force: true });

    updateProgress(100, "Export completed.");
    return {
      success: true,
      downloadUrl: `/api/exports/${path.basename(tempExportPath)}`,
    };
  } catch (error: any) {
    console.error("Error exporting all user data:", error);
    updateProgress(100, "Export failed.");
    return {
      success: false,
      error: error.message || "Failed to export all user data.",
    };
  }
};

export const exportWholeDataFolder = async (): Promise<ExportResult> => {
  updateProgress(0, "Preparing the whole data folder for export...");
  try {
    const dataFolderPath = path.join(process.cwd(), DATA_DIR);
    const tempExportPath = path.join(
      process.cwd(),
      EXPORT_TEMP_DIR,
      `whole_data_folder_${Date.now()}.zip`
    );

    await ensureDir(path.join(process.cwd(), EXPORT_TEMP_DIR));

    updateProgress(50, "Compressing the whole data folder...");
    await zipDirectory(dataFolderPath, tempExportPath, updateProgress, true);

    updateProgress(100, "Export completed.");
    return {
      success: true,
      downloadUrl: `/api/exports/${path.basename(tempExportPath)}`,
    };
  } catch (error: any) {
    console.error("Error exporting whole data folder:", error);
    console.error(error.stack);
    updateProgress(100, "Export failed.");
    return {
      success: false,
      error: error.message || "Failed to export whole data folder.",
    };
  }
};
