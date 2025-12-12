import { z } from "zod";
import { Modes } from "@/app/_types/enums";

export const userSettingsSchema = z.object({
  preferredTheme: z.string().min(1, "Theme is required"),
  tableSyntax: z.enum(["html", "markdown"], {
    message: "Table syntax must be either 'html' or 'markdown'",
  }),
  landingPage: z.enum([Modes.CHECKLISTS, Modes.NOTES, "last-visited"], {
    message: "Landing page must be 'checklists', 'notes', or 'last-visited'",
  }),
});

export const editorSettingsSchema = z.object({
  notesDefaultEditor: z.enum(["wysiwyg", "markdown"], {
    message: "Notes default editor must be either 'wysiwyg' or 'markdown'",
  }),
  tableSyntax: z.enum(["html", "markdown"], {
    message: "Table syntax must be either 'html' or 'markdown'",
  }),
  notesDefaultMode: z.enum(["edit", "view"], {
    message: "Notes default mode must be either 'edit' or 'view'",
  }),
  notesAutoSaveInterval: z
    .number()
    .min(0, "Notes auto save interval must be greater than 0"),
  disableFormatting: z.enum(["enable", "disable"], {
    message: "Disable formatting must be either 'enable' or 'disable'",
  }),
  disableRichEditor: z.enum(["enable", "disable"], {
    message: "Disable rich editor must be either 'enable' or 'disable'",
  }),
});

export const checklistSettingsSchema = z.object({
  enableRecurrence: z.enum(["enable", "disable"], {
    message: "Enable recurrence must be either 'enable' or 'disable'",
  }),
  showCompletedSuggestions: z.enum(["enable", "disable"], {
    message: "Show completed suggestions must be either 'enable' or 'disable'",
  }),
});

export const fileSettingsSchema = z.object({
  fileRenameMode: z.enum(["dash-case", "minimal", "none"], {
    message: "File rename mode must be 'dash-case', 'minimal', or 'none'",
  }),
});

export const generalSettingsSchema = z.object({
  preferredTheme: z.string().min(1, "Theme is required"),
  landingPage: z.enum([Modes.CHECKLISTS, Modes.NOTES, "last-visited"], {
    message: "Landing page must be 'checklists', 'notes', or 'last-visited'",
  }),
  fileRenameMode: z.enum(["dash-case", "minimal", "none"], {
    message: "File rename mode must be 'dash-case', 'minimal', or 'none'",
  }),
  preferredDateFormat: z.enum(["dd/mm/yyyy", "mm/dd/yyyy"]),
  preferredTimeFormat: z.enum(["12-hours", "24-hours"]),
});

export type UserSettingsInput = z.infer<typeof userSettingsSchema>;
export type EditorSettingsInput = z.infer<typeof editorSettingsSchema>;
export type ChecklistSettingsInput = z.infer<typeof checklistSettingsSchema>;
export type FileSettingsInput = z.infer<typeof fileSettingsSchema>;
export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;
