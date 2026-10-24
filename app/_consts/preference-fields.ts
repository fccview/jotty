import type { User } from "@/app/_types";
import { ToggleState, Modes } from "@/app/_types/enums";
import { CHECKLIST_FILTERS, NOTE_FILTERS } from "@/app/_consts/browse";
import { HOME_WIDGET_COPY, HOME_WIDGET_KEYS } from "@/app/_consts/home";
import { WeekDay } from "@/app/_consts/calendar";
import { SearchModes } from "@/app/_consts/search";
import { VIEW_MODE_OPTIONS } from "@/app/_consts/view-modes";
import { SETTING_DEFAULTS } from "@/app/_consts/user-settings";
import { AUTOSAVE_DEFAULT_MS } from "@/app/_utils/autosave-utils";

export interface ChoiceOption {
  id: string | number;
  labelKey?: string;
  label?: string;
  labelValues?: Record<string, number>;
}

export interface ChoiceField {
  key: keyof User;
  inputId: string;
  labelKey: string;
  descriptionKey?: string;
  placeholderKey?: string;
  badgeKey?: string;
  contrastParam?: string;
  options: ChoiceOption[];
  defaultValue: string | number;
  normalise?: (value: string | number) => string | number;
}

const ENABLE_DISABLE: ChoiceOption[] = [
  { id: ToggleState.ENABLE, labelKey: "settings.enable" },
  { id: ToggleState.DISABLE, labelKey: "settings.disable" },
];

const NOTE_FILTER_LABELS: Record<(typeof NOTE_FILTERS)[number], string> = {
  all: "notes.allNotes",
  recent: "notes.recent",
  pinned: "common.pinned",
};

const CHECKLIST_FILTER_LABELS: Record<(typeof CHECKLIST_FILTERS)[number], string> = {
  all: "checklists.allChecklists",
  completed: "checklists.completed",
  incomplete: "checklists.incomplete",
  pinned: "common.pinned",
  task: "checklists.taskLists",
  simple: "checklists.simpleLists",
};

const field = (def: Omit<ChoiceField, "defaultValue">): ChoiceField => ({
  ...def,
  defaultValue: SETTING_DEFAULTS[def.key as keyof typeof SETTING_DEFAULTS],
});

export const GENERAL_FIELDS: ChoiceField[] = [
  field({
    key: "landingPage",
    inputId: "landing-page",
    labelKey: "settings.initialLandingPage",
    descriptionKey: "settings.selectDefaultPageAfterLogin",
    placeholderKey: "settings.selectLandingPage",
    options: [
      { id: "last-visited", labelKey: "settings.lastVisitedPage" },
      { id: Modes.CHECKLISTS, labelKey: "checklists.title" },
      { id: Modes.NOTES, labelKey: "notes.title" },
    ],
  }),
  field({
    key: "fileRenameMode",
    inputId: "file-rename-mode",
    labelKey: "settings.fileRenameMode",
    descriptionKey: "settings.chooseFileRenameMode",
    placeholderKey: "settings.selectFileRenameMode",
    options: [
      { id: "dash-case", labelKey: "settings.dashCase" },
      { id: "minimal", labelKey: "settings.minimal" },
      { id: "none", labelKey: "settings.noRename" },
    ],
  }),
  field({
    key: "preferredDateFormat",
    inputId: "preferred-date-format",
    labelKey: "settings.preferredDateFormat",
    descriptionKey: "settings.choosePreferredDateFormat",
    placeholderKey: "settings.selectDateFormat",
    options: [
      { id: "system", labelKey: "settings.useSystemDefault" },
      { id: "dd/mm/yyyy", label: "DD/MM/YYYY" },
      { id: "mm/dd/yyyy", label: "MM/DD/YYYY" },
      { id: "yyyy/mm/dd", label: "YYYY/MM/DD" },
    ],
  }),
  field({
    key: "preferredTimeFormat",
    inputId: "preferred-time-format",
    labelKey: "settings.preferredTimeFormat",
    descriptionKey: "settings.choosePreferredTimeFormat",
    placeholderKey: "settings.selectTimeFormat",
    options: [
      { id: "system", labelKey: "settings.useSystemDefault" },
      { id: "12-hours", labelKey: "settings.hours12" },
      { id: "24-hours", labelKey: "settings.hours24" },
    ],
  }),
  field({
    key: "firstDayOfWeek",
    inputId: "first-day-of-week",
    labelKey: "settings.firstDayOfWeek",
    descriptionKey: "settings.chooseFirstDayOfWeek",
    placeholderKey: "settings.selectFirstDayOfWeek",
    options: [
      { id: WeekDay.SUNDAY, labelKey: "settings.sunday" },
      { id: WeekDay.MONDAY, labelKey: "settings.monday" },
      { id: WeekDay.SATURDAY, labelKey: "settings.saturday" },
    ],
  }),
  field({
    key: "handedness",
    inputId: "handedness",
    labelKey: "settings.handedness",
    descriptionKey: "settings.chooseHandedness",
    placeholderKey: "settings.selectHandedness",
    options: [
      { id: "right-handed", labelKey: "settings.rightHanded" },
      { id: "left-handed", labelKey: "settings.leftHanded" },
    ],
  }),
  field({
    key: "hideConnectionIndicator",
    inputId: "hide-connection-indicator",
    labelKey: "settings.hideConnectionIndicator",
    descriptionKey: "settings.hideConnectionIndicatorDescription",
    placeholderKey: "settings.selectConnectionIndicator",
    options: [
      { id: ToggleState.DISABLE, labelKey: "settings.showIndicator" },
      { id: ToggleState.ENABLE, labelKey: "settings.hideIndicator" },
    ],
  }),
  field({
    key: "searchMode",
    inputId: "search-mode",
    labelKey: "settings.searchMode",
    descriptionKey: "settings.searchModeDescription",
    placeholderKey: "settings.selectSearchMode",
    options: [
      { id: SearchModes.SMART, labelKey: "settings.searchModeSmart" },
      { id: SearchModes.RANKED, labelKey: "settings.searchModeRanked" },
      { id: SearchModes.SUBSTRING, labelKey: "settings.searchModeSubstring" },
    ],
  }),
];

export const NOTE_LEAD_FIELDS: ChoiceField[] = [
  field({
    key: "notesAutoSaveInterval",
    inputId: "auto-save-interval",
    labelKey: "settings.autoSaveInterval",
    descriptionKey: "settings.chooseAutoSaveInterval",
    placeholderKey: "settings.selectAutoSaveInterval",
    options: [
      { id: 0, labelKey: "settings.disabled" },
      { id: AUTOSAVE_DEFAULT_MS, labelKey: "settings.enabled" },
    ],
    normalise: (value) => (Number(value) === 0 ? 0 : AUTOSAVE_DEFAULT_MS),
  }),
  field({
    key: "notesDefaultMode",
    inputId: "notes-default-mode",
    labelKey: "settings.defaultMode",
    descriptionKey: "settings.chooseNotesDefaultMode",
    placeholderKey: "settings.selectNotesDefaultMode",
    contrastParam: "mode",
    options: [
      { id: "edit", labelKey: "settings.edit" },
      { id: "view", labelKey: "settings.view" },
    ],
  }),
];

export const NOTE_FIELDS: ChoiceField[] = [
  field({
    key: "browseViewMode",
    inputId: "browse-view-mode",
    labelKey: "settingsModal.viewMode",
    descriptionKey: "settings.browseViewModeDescription",
    options: VIEW_MODE_OPTIONS.map(({ id, labelKey }) => ({ id, labelKey })),
  }),
  field({
    key: "notesCardPreview",
    inputId: "notes-card-preview",
    labelKey: "settingsModal.showNotePreview",
    descriptionKey: "settings.notesCardPreviewDescription",
    options: ENABLE_DISABLE,
  }),
  field({
    key: "notesCompactMode",
    inputId: "notes-compact-mode",
    labelKey: "settingsModal.notesCompactMode",
    descriptionKey: "settings.notesCompactModeDescription",
    options: ENABLE_DISABLE,
  }),
  field({
    key: "notesDetailsPanel",
    inputId: "notes-details-panel",
    labelKey: "settingsModal.notesDetailsPanel",
    descriptionKey: "settings.notesDetailsPanelDescription",
    options: ENABLE_DISABLE,
  }),
  field({
    key: "notesDefaultEditor",
    inputId: "notes-default-editor",
    labelKey: "settings.defaultEditor",
    descriptionKey: "settings.chooseDefaultEditor",
    placeholderKey: "settings.selectNotesDefaultEditor",
    contrastParam: "editor",
    options: [
      { id: "wysiwyg", labelKey: "settings.richTextEditor" },
      { id: "markdown", labelKey: "settings.markdown" },
    ],
  }),
  field({
    key: "tableSyntax",
    inputId: "table-syntax",
    labelKey: "settings.tableSyntaxInNotes",
    descriptionKey: "settings.chooseTableSyntax",
    placeholderKey: "settings.selectTableSyntax",
    options: [
      { id: "markdown", labelKey: "settings.markdownTableSyntax" },
      { id: "html", labelKey: "settings.htmlTableSyntax" },
    ],
  }),
  field({
    key: "markdownTheme",
    inputId: "markdown-theme",
    labelKey: "settings.markdownSyntaxTheme",
    descriptionKey: "settings.chooseSyntaxTheme",
    placeholderKey: "settings.selectSyntaxTheme",
    options: [
      { id: "prism", labelKey: "settings.default" },
      { id: "prism-dark", labelKey: "settings.dark" },
      { id: "prism-funky", labelKey: "settings.funky" },
      { id: "prism-okaidia", labelKey: "settings.okaidia" },
      { id: "prism-tomorrow", labelKey: "settings.tomorrow" },
      { id: "prism-twilight", labelKey: "settings.twilight" },
      { id: "prism-coy", labelKey: "settings.coy" },
      { id: "prism-solarizedlight", labelKey: "settings.solarizedLight" },
    ],
  }),
  field({
    key: "codeBlockStyle",
    inputId: "code-block-style",
    labelKey: "settings.codeBlockChoice",
    descriptionKey: "settings.codeBlockChoiceDescription",
    placeholderKey: "settings.codeBlockChoice",
    options: [
      { id: "default", labelKey: "settings.defaultCodeBlock" },
      { id: "themed", labelKey: "settings.themedCodeBlock" },
    ],
  }),
  field({
    key: "disableRichEditor",
    inputId: "disable-rich-editor",
    labelKey: "settings.minimalMode",
    descriptionKey: "settings.minimalModeDescription",
    placeholderKey: "settings.selectMinimalMode",
    options: [
      { id: ToggleState.DISABLE, labelKey: "settings.useRichTextEditor" },
      { id: ToggleState.ENABLE, labelKey: "settings.markdownOnly" },
    ],
  }),
  field({
    key: "defaultNoteFilter",
    inputId: "default-note-filter",
    labelKey: "settings.defaultNoteFilter",
    descriptionKey: "settings.chooseDefaultNoteFilter",
    placeholderKey: "settings.selectDefaultNoteFilter",
    options: NOTE_FILTERS.map((id) => ({ id, labelKey: NOTE_FILTER_LABELS[id] })),
  }),
  field({
    key: "quickCreateNotes",
    inputId: "quick-create-notes",
    labelKey: "settings.quickCreateNotes",
    descriptionKey: "settings.quickCreateNotesDescription",
    placeholderKey: "settings.selectQuickCreateNotes",
    options: [
      { id: ToggleState.DISABLE, labelKey: "settings.quickCreateNotesShowModal" },
      { id: ToggleState.ENABLE, labelKey: "settings.quickCreateNotesSkipModal" },
    ],
  }),
];

export const CHECKLIST_FIELDS: ChoiceField[] = [
  field({
    key: "enableRecurrence",
    inputId: "enable-recurrence",
    labelKey: "settings.recurringChecklists",
    badgeKey: "settings.beta",
    placeholderKey: "settings.selectEnableRecurring",
    options: ENABLE_DISABLE,
  }),
  field({
    key: "showCompletedSuggestions",
    inputId: "show-completed-suggestions",
    labelKey: "settings.showCompletedSuggestions",
    descriptionKey: "settings.completedSuggestionsDescription",
    placeholderKey: "settings.selectShowCompletedSuggestions",
    options: ENABLE_DISABLE,
  }),
  field({
    key: "showChecklistEmojis",
    inputId: "show-checklist-emojis",
    labelKey: "settingsModal.showEmojis",
    descriptionKey: "settings.showChecklistEmojisDescription",
    placeholderKey: "settings.selectShowChecklistEmojis",
    options: ENABLE_DISABLE,
  }),
  field({
    key: "defaultChecklistFilter",
    inputId: "default-checklist-filter",
    labelKey: "settings.defaultChecklistFilter",
    descriptionKey: "settings.chooseDefaultChecklistFilter",
    placeholderKey: "settings.selectDefaultChecklistFilter",
    options: CHECKLIST_FILTERS.map((id) => ({ id, labelKey: CHECKLIST_FILTER_LABELS[id] })),
  }),
  field({
    key: "checklistItemClickAction",
    inputId: "checklist-item-click-action",
    labelKey: "settings.checklistItemClickAction",
    descriptionKey: "settings.checklistItemClickActionDescription",
    placeholderKey: "settings.selectChecklistItemClickAction",
    options: [
      { id: "toggle", labelKey: "settings.checklistItemClickActionToggle" },
      { id: "edit", labelKey: "settings.checklistItemClickActionEdit" },
    ],
  }),
  field({
    key: "newItemInsertion",
    inputId: "new-item-insertion",
    labelKey: "settings.newItemInsertion",
    descriptionKey: "settings.newItemInsertionDescription",
    placeholderKey: "settings.selectNewItemInsertion",
    options: [
      { id: "top", labelKey: "settings.newItemInsertionTop" },
      { id: "bottom", labelKey: "settings.newItemInsertionBottom" },
    ],
  }),
];

export const HOME_WIDGET_FIELDS: ChoiceField[] = HOME_WIDGET_KEYS.map((key) =>
  field({
    key,
    inputId: key,
    labelKey: HOME_WIDGET_COPY[key].labelKey,
    descriptionKey: HOME_WIDGET_COPY[key].descriptionKey,
    options: [
      { id: ToggleState.ENABLE, labelKey: "common.enabled" },
      { id: ToggleState.DISABLE, labelKey: "common.disabled" },
    ],
  }),
);

export const KANBAN_FIELDS: ChoiceField[] = [
  field({
    key: "hideStatusOnCards",
    inputId: "hide-status-on-cards",
    labelKey: "settings.hideStatusOnCardsLabel",
    descriptionKey: "settings.hideStatusOnCardsDescription",
    placeholderKey: "settings.selectStatusOnCards",
    options: [
      { id: ToggleState.DISABLE, labelKey: "settings.showStatusOnCards" },
      { id: ToggleState.ENABLE, labelKey: "settings.hideStatusOnCards" },
    ],
  }),
  field({
    key: "hideMobileStatusDropdown",
    inputId: "hide-mobile-status-dropdown",
    labelKey: "settings.hideMobileStatusDropdownLabel",
    descriptionKey: "settings.hideMobileStatusDropdownDescription",
    placeholderKey: "settings.selectMobileStatusDropdown",
    options: [
      { id: ToggleState.DISABLE, labelKey: "settings.showMobileStatusDropdown" },
      { id: ToggleState.ENABLE, labelKey: "settings.hideMobileStatusDropdown" },
    ],
  }),
  field({
    key: "hideTimeTrackingOnCards",
    inputId: "hide-time-tracking-on-cards",
    labelKey: "settings.hideTimeTrackingOnCardsLabel",
    descriptionKey: "settings.hideTimeTrackingOnCardsDescription",
    placeholderKey: "settings.selectTimeTrackingOnCards",
    options: [
      { id: ToggleState.DISABLE, labelKey: "settings.showTimeTrackingOnCards" },
      { id: ToggleState.ENABLE, labelKey: "settings.hideTimeTrackingOnCards" },
    ],
  }),
];
