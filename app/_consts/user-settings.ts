import { User } from "@/app/_types";
import { HomeWidget, Modes } from "@/app/_types/enums";
import { HOME_WIDGET_KEYS, HomeWidgetKey } from "@/app/_consts/home";
import { DEFAULT_WEEK_START } from "@/app/_consts/calendar";
import { DEFAULT_SEARCH_MODE } from "@/app/_consts/search";
import { DEFAULT_VIEW_MODE } from "@/app/_consts/view-modes";
import { AUTOSAVE_DEFAULT_MS } from "@/app/_utils/autosave-utils";

export const EDITABLE_SETTING_KEYS: ReadonlyArray<keyof User> = [
  "preferredLocale",
  "preferredTheme",
  "tableSyntax",
  "imageSyntax",
  "landingPage",
  "notesDefaultEditor",
  "notesDefaultMode",
  "notesFontSize",
  "notesCardPreview",
  "notesCompactMode",
  "preferredBorderRadius",
  "kanbanColumnWidth",
  "browseViewMode",
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

type SettingDefaults = { [K in keyof User]?: NonNullable<User[K]> };

const WIDGET_DEFAULTS = Object.fromEntries(
  HOME_WIDGET_KEYS.map((key) => [key, HomeWidget.ENABLE]),
) as Record<HomeWidgetKey, HomeWidget>;

export const SETTING_DEFAULTS = {
  preferredTheme: "system",
  tableSyntax: "markdown",
  landingPage: Modes.CHECKLISTS,
  notesDefaultEditor: "wysiwyg",
  notesDefaultMode: "view",
  notesCardPreview: "disable",
  notesCompactMode: "disable",
  browseViewMode: DEFAULT_VIEW_MODE,
  notesAutoSaveInterval: AUTOSAVE_DEFAULT_MS,
  enableRecurrence: "disable",
  showCompletedSuggestions: "enable",
  showChecklistEmojis: "enable",
  fileRenameMode: "minimal",
  preferredDateFormat: "system",
  preferredTimeFormat: "system",
  firstDayOfWeek: DEFAULT_WEEK_START,
  handedness: "right-handed",
  disableRichEditor: "disable",
  markdownTheme: "prism",
  defaultChecklistFilter: "all",
  checklistItemClickAction: "toggle",
  defaultNoteFilter: "all",
  quickCreateNotes: "disable",
  hideConnectionIndicator: "disable",
  hideStatusOnCards: "disable",
  hideMobileStatusDropdown: "disable",
  hideTimeTrackingOnCards: "disable",
  codeBlockStyle: "default",
  newItemInsertion: "top",
  searchMode: DEFAULT_SEARCH_MODE,
  ...WIDGET_DEFAULTS,
} as const satisfies SettingDefaults;
