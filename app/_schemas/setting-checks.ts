import type { User } from "@/app/_types";
import { HOME_WIDGET_KEYS } from "@/app/_consts/home";
import {
  checklistSettingsSchema,
  editorSettingsSchema,
  generalSettingsSchema,
  homeWidgetsSettingsSchema,
  kanbanSettingsSchema,
} from "@/app/_schemas/user-schemas";

type SettingsSchema =
  | typeof generalSettingsSchema
  | typeof editorSettingsSchema
  | typeof checklistSettingsSchema
  | typeof kanbanSettingsSchema
  | typeof homeWidgetsSettingsSchema;

const SECTION_KEYS: [SettingsSchema, (keyof User)[]][] = [
  [
    generalSettingsSchema,
    [
      "preferredLocale",
      "preferredTheme",
      "preferredBorderRadius",
      "landingPage",
      "fileRenameMode",
      "preferredDateFormat",
      "preferredTimeFormat",
      "firstDayOfWeek",
      "handedness",
      "hideConnectionIndicator",
      "searchMode",
    ],
  ],
  [
    editorSettingsSchema,
    [
      "notesAutoSaveInterval",
      "notesDefaultMode",
      "notesFontSize",
      "browseViewMode",
      "notesCardPreview",
      "notesCompactMode",
      "notesDetailsPanel",
      "notesDefaultEditor",
      "tableSyntax",
      "disableRichEditor",
      "defaultNoteFilter",
      "markdownTheme",
      "codeBlockStyle",
      "quickCreateNotes",
      "quickCreateNotesCategory",
    ],
  ],
  [
    checklistSettingsSchema,
    [
      "enableRecurrence",
      "showCompletedSuggestions",
      "showChecklistEmojis",
      "defaultChecklistFilter",
      "checklistItemClickAction",
      "newItemInsertion",
    ],
  ],
  [
    kanbanSettingsSchema,
    ["kanbanColumnWidth", "hideStatusOnCards", "hideMobileStatusDropdown", "hideTimeTrackingOnCards"],
  ],
  [homeWidgetsSettingsSchema, [...HOME_WIDGET_KEYS]],
];

const SETTING_SCHEMAS = new Map<keyof User, SettingsSchema>(
  SECTION_KEYS.flatMap(([schema, keys]) => keys.map((key) => [key, schema] as const)),
);

export const settingErrorOf = (key: keyof User, value: unknown): string | null => {
  if (value === null) return null;
  const parsed = SETTING_SCHEMAS.get(key)?.partial().safeParse({ [key]: value });
  if (!parsed || parsed.success) return null;
  return parsed.error.issues[0]?.message || "";
};
