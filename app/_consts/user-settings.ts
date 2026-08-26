import { User } from "@/app/_types";

export const EDITABLE_SETTING_KEYS: ReadonlyArray<keyof User> = [
  "preferredLocale",
  "preferredTheme",
  "tableSyntax",
  "imageSyntax",
  "landingPage",
  "notesDefaultEditor",
  "notesDefaultMode",
  "notesAutoSaveInterval",
  "enableRecurrence",
  "showCompletedSuggestions",
  "showChecklistEmojis",
  "fileRenameMode",
  "preferredDateFormat",
  "preferredTimeFormat",
  "firstDayOfWeek",
  "handedness",
  "disableRichEditor",
  "markdownTheme",
  "defaultChecklistFilter",
  "checklistItemClickAction",
  "defaultNoteFilter",
  "quickCreateNotes",
  "quickCreateNotesCategory",
  "hideConnectionIndicator",
  "hideStatusOnCards",
  "hideMobileStatusDropdown",
  "hideTimeTrackingOnCards",
  "codeBlockStyle",
] as const;

export const EDITABLE_ENCRYPTION_KEYS = [
  "method",
  "hasKeys",
  "autoDecrypt",
] as const;
