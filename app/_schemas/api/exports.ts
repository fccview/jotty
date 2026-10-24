import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import { ExportKind } from "@/app/_types/export";

export const exportRequestBody = z.object({
  type: z
    .enum(ExportKind, {
      error: (issue) => (issue.input ? "Invalid export type" : "Export type is required"),
    })
    .describe("all_checklists_notes, all_users_data and whole_data_folder need an admin with content access"),
  username: z
    .string()
    .optional()
    .describe("Whose data to export, required for user_checklists_notes. Only admins with content access can name somebody else"),
});

export const exportStartedSchema = z.object({
  success: z.literal(true),
  downloadUrl: z.string().describe("Path to fetch the zip from, it can be downloaded once"),
});

export const exportProgressSchema = z
  .object({
    progress: z.number().describe("Percentage done"),
    message: z.string(),
  })
  .register(apiNames, { id: "ExportProgress" });

export const exportFileParams = z.object({
  filename: z.string().describe("File name from the downloadUrl of a finished export"),
});

export const zipFileSchema = z.string().meta({ format: "binary" });
