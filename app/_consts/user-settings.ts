import { User } from "@/app/_types";
import { HOME_WIDGET_KEYS } from "@/app/_consts/home";

export const EDITABLE_SETTING_KEYS: ReadonlyArray<keyof User> = [
  "preferredLocale",
  "preferredTheme",
  "tableSyntax",
  "imageSyntax",
  "landingPage",
  "notesDefaultEditor",
  "notesDefaultMode",
  "notesFontSize",
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
  "newItemInsertion",
  "searchMode",
  ...HOME_WIDGET_KEYS,
] as const;

export const EDITABLE_ENCRYPTION_KEYS = [
  "method",
  "hasKeys",
  "autoDecrypt",
] as const;
