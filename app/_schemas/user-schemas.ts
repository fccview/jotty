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

export const themeSettingsSchema = z.object({
  preferredTheme: z.string().min(1, "Theme is required"),
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
});

export const navigationSettingsSchema = z.object({
  landingPage: z.enum([Modes.CHECKLISTS, Modes.NOTES, "last-visited"], {
    message: "Landing page must be 'checklists', 'notes', or 'last-visited'",
  }),
});

export const checklistSettingsSchema = z.object({
  enableRecurrence: z.enum(["enable", "disable"], {
    message: "Enable recurrence must be either 'enable' or 'disable'",
  }),
});

export type UserSettingsInput = z.infer<typeof userSettingsSchema>;
export type ThemeSettingsInput = z.infer<typeof themeSettingsSchema>;
export type EditorSettingsInput = z.infer<typeof editorSettingsSchema>;
export type NavigationSettingsInput = z.infer<typeof navigationSettingsSchema>;
export type ChecklistSettingsInput = z.infer<typeof checklistSettingsSchema>;
