import type { User, UserSettingsPatch } from "@/app/_types";
import { ToggleState } from "@/app/_types/enums";
import {
  BORDER_RADIUS_STEP,
  DEFAULT_KANBAN_COLUMN_WIDTH,
  DEFAULT_NOTE_FONT_SIZE,
  KANBAN_COLUMN_WIDTH_STEP,
  MAX_BORDER_RADIUS,
  MAX_KANBAN_COLUMN_WIDTH,
  MAX_NOTE_FONT_SIZE,
  MIN_BORDER_RADIUS,
  MIN_KANBAN_COLUMN_WIDTH,
  MIN_NOTE_FONT_SIZE,
  NOTE_FONT_SIZE_STEP,
  clampKanbanColumnWidth,
  clampNoteFontSize,
  clampRadius,
  normaliseKanbanColumnWidth,
  normaliseNoteFontSize,
} from "@/app/_consts/styling";
import { DEFAULT_VIEW_MODE, VIEW_MODES, ViewMode } from "@/app/_consts/view-modes";
import { AUTOSAVE_DEFAULT_MS } from "@/app/_utils/autosave-utils";

export enum QuickSettingId {
  THEME = "theme",
  BORDER_RADIUS = "borderRadius",
  NOTE_FONT_SIZE = "noteFontSize",
  KANBAN_COLUMN_WIDTH = "kanbanColumnWidth",
  VIEW_MODE = "viewMode",
  CARD_PREVIEW = "showMarkdownPreview",
  COMPACT_MODE = "compactMode",
  DETAILS_PANEL = "detailsPanel",
  AUTOSAVE = "autosaveNotes",
  SHOW_EMOJIS = "showEmojis",
  COMPLETED_SUGGESTIONS = "showCompletedSuggestions",
}

export enum QuickTab {
  APPEARANCE = "appearance",
  NOTES = "notes",
  LISTS = "lists",
}

export enum QuickControl {
  THEME = "theme",
  SLIDER = "slider",
  TOGGLE = "toggle",
  CHOICE = "choice",
}

export const SYSTEM_THEME = "system";

export const SETTINGS_STORAGE_KEY = "checklist-settings";

export const SETTINGS_STORE_VERSION = 2;

export interface QuickSettingValues {
  [QuickSettingId.THEME]: string;
  [QuickSettingId.BORDER_RADIUS]: number | null;
  [QuickSettingId.NOTE_FONT_SIZE]: number | null;
  [QuickSettingId.KANBAN_COLUMN_WIDTH]: number | null;
  [QuickSettingId.VIEW_MODE]: ViewMode;
  [QuickSettingId.CARD_PREVIEW]: boolean;
  [QuickSettingId.COMPACT_MODE]: boolean;
  [QuickSettingId.DETAILS_PANEL]: boolean;
  [QuickSettingId.AUTOSAVE]: boolean;
  [QuickSettingId.SHOW_EMOJIS]: boolean;
  [QuickSettingId.COMPLETED_SUGGESTIONS]: boolean;
}

export type QuickOverrides = Partial<QuickSettingValues>;

export type AccountUser = Partial<User> | null | undefined;

type Translate = (key: string, values?: Record<string, string | number>) => string;

export interface SliderControl {
  kind: QuickControl.SLIDER;
  min: number;
  max: number;
  step: number;
  fallback: (instanceRadius?: number) => number;
  valueText: (value: number | null, shown: number, t: Translate) => string;
}

interface PlainControl {
  kind: QuickControl.THEME | QuickControl.TOGGLE | QuickControl.CHOICE;
}

export type QuickControlConfig = SliderControl | PlainControl;

export interface QuickSettingDef<K extends QuickSettingId, UK extends keyof User> {
  userKey: UK;
  tab: QuickTab;
  labelKey: string;
  control: QuickControlConfig;
  fromUser: (user: AccountUser) => QuickSettingValues[K];
  toUser: (value: QuickSettingValues[K], user: AccountUser) => NonNullable<User[UK]> | null;
  sanitise: (value: unknown) => QuickSettingValues[K] | undefined;
}

type QuickSettingsRegistry = {
  [K in QuickSettingId]: QuickSettingDef<K, keyof User>;
};

const COMPACT_COLUMN_MAX = 240;
const COMFORTABLE_COLUMN_MAX = 360;

const toToggle = (value: boolean): ToggleState =>
  value ? ToggleState.ENABLE : ToggleState.DISABLE;

const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const asFinite = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const columnPresetKey = (width: number): string => {
  if (width <= COMPACT_COLUMN_MAX) return "settingsModal.kanbanColumnWidthCompact";
  if (width <= COMFORTABLE_COLUMN_MAX) return "settingsModal.kanbanColumnWidthComfortable";
  return "settingsModal.kanbanColumnWidthWide";
};

const define = <K extends QuickSettingId, UK extends keyof User>(
  def: QuickSettingDef<K, UK>,
): QuickSettingDef<K, UK> => def;

export const QUICK_SETTINGS: QuickSettingsRegistry = {
  [QuickSettingId.THEME]: define<QuickSettingId.THEME, "preferredTheme">({
    userKey: "preferredTheme",
    tab: QuickTab.APPEARANCE,
    labelKey: "quickSettings.labels.theme",
    control: { kind: QuickControl.THEME },
    fromUser: (user) => user?.preferredTheme || SYSTEM_THEME,
    toUser: (value) => value,
    sanitise: (value) =>
      typeof value === "string" && value.length > 0 ? value : undefined,
  }),
  [QuickSettingId.BORDER_RADIUS]: define<QuickSettingId.BORDER_RADIUS, "preferredBorderRadius">({
    userKey: "preferredBorderRadius",
    tab: QuickTab.APPEARANCE,
    labelKey: "quickSettings.labels.borderRadius",
    control: {
      kind: QuickControl.SLIDER,
      min: MIN_BORDER_RADIUS,
      max: MAX_BORDER_RADIUS,
      step: BORDER_RADIUS_STEP,
      fallback: (instanceRadius) => clampRadius(instanceRadius),
      valueText: (value, shown, t) =>
        value === null
          ? t("settings.defaultOption", { value: `${clampRadius(shown)}rem` })
          : `${clampRadius(shown)}rem`,
    },
    fromUser: (user) => {
      const radius = asFinite(user?.preferredBorderRadius);
      return radius === undefined ? null : clampRadius(radius);
    },
    toUser: (value) => (value === null ? null : clampRadius(value)),
    sanitise: (value) => {
      if (value === null) return null;
      const radius = asFinite(value);
      return radius === undefined ? undefined : clampRadius(radius);
    },
  }),
  [QuickSettingId.NOTE_FONT_SIZE]: define<QuickSettingId.NOTE_FONT_SIZE, "notesFontSize">({
    userKey: "notesFontSize",
    tab: QuickTab.NOTES,
    labelKey: "quickSettings.labels.noteFontSize",
    control: {
      kind: QuickControl.SLIDER,
      min: MIN_NOTE_FONT_SIZE,
      max: MAX_NOTE_FONT_SIZE,
      step: NOTE_FONT_SIZE_STEP,
      fallback: () => DEFAULT_NOTE_FONT_SIZE,
      valueText: (value, shown, t) =>
        value === null ? t("settings.default") : `${clampNoteFontSize(shown)}px`,
    },
    fromUser: (user) => normaliseNoteFontSize(user?.notesFontSize) || null,
    toUser: (value) => (value === null ? null : clampNoteFontSize(value)),
    sanitise: (value) => {
      if (value === null) return null;
      const size = asFinite(value);
      return size === undefined ? undefined : clampNoteFontSize(size);
    },
  }),
  [QuickSettingId.KANBAN_COLUMN_WIDTH]: define<QuickSettingId.KANBAN_COLUMN_WIDTH, "kanbanColumnWidth">({
    userKey: "kanbanColumnWidth",
    tab: QuickTab.LISTS,
    labelKey: "quickSettings.labels.kanbanColumnWidth",
    control: {
      kind: QuickControl.SLIDER,
      min: MIN_KANBAN_COLUMN_WIDTH,
      max: MAX_KANBAN_COLUMN_WIDTH,
      step: KANBAN_COLUMN_WIDTH_STEP,
      fallback: () => DEFAULT_KANBAN_COLUMN_WIDTH,
      valueText: (value, shown, t) =>
        value === null
          ? t("settingsModal.kanbanColumnWidthAutoFit")
          : t(columnPresetKey(shown)),
    },
    fromUser: (user) => normaliseKanbanColumnWidth(user?.kanbanColumnWidth) || null,
    toUser: (value) => (value === null ? null : clampKanbanColumnWidth(value)),
    sanitise: (value) => {
      if (value === null) return null;
      const width = asFinite(value);
      return width === undefined ? undefined : clampKanbanColumnWidth(width);
    },
  }),
  [QuickSettingId.VIEW_MODE]: define<QuickSettingId.VIEW_MODE, "browseViewMode">({
    userKey: "browseViewMode",
    tab: QuickTab.APPEARANCE,
    labelKey: "quickSettings.labels.viewMode",
    control: { kind: QuickControl.CHOICE },
    fromUser: (user) =>
      VIEW_MODES.find((mode) => mode === user?.browseViewMode) || DEFAULT_VIEW_MODE,
    toUser: (value) => value,
    sanitise: (value) => VIEW_MODES.find((mode) => mode === value),
  }),
  [QuickSettingId.CARD_PREVIEW]: define<QuickSettingId.CARD_PREVIEW, "notesCardPreview">({
    userKey: "notesCardPreview",
    tab: QuickTab.NOTES,
    labelKey: "quickSettings.labels.cardPreview",
    control: { kind: QuickControl.TOGGLE },
    fromUser: (user) => user?.notesCardPreview === ToggleState.ENABLE,
    toUser: toToggle,
    sanitise: asBoolean,
  }),
  [QuickSettingId.COMPACT_MODE]: define<QuickSettingId.COMPACT_MODE, "notesCompactMode">({
    userKey: "notesCompactMode",
    tab: QuickTab.NOTES,
    labelKey: "quickSettings.labels.compactMode",
    control: { kind: QuickControl.TOGGLE },
    fromUser: (user) => user?.notesCompactMode === ToggleState.ENABLE,
    toUser: toToggle,
    sanitise: asBoolean,
  }),
  [QuickSettingId.DETAILS_PANEL]: define<QuickSettingId.DETAILS_PANEL, "notesDetailsPanel">({
    userKey: "notesDetailsPanel",
    tab: QuickTab.NOTES,
    labelKey: "quickSettings.labels.detailsPanel",
    control: { kind: QuickControl.TOGGLE },
    fromUser: (user) => user?.notesDetailsPanel !== ToggleState.DISABLE,
    toUser: toToggle,
    sanitise: asBoolean,
  }),
  [QuickSettingId.AUTOSAVE]: define<QuickSettingId.AUTOSAVE, "notesAutoSaveInterval">({
    userKey: "notesAutoSaveInterval",
    tab: QuickTab.NOTES,
    labelKey: "quickSettings.labels.autosave",
    control: { kind: QuickControl.TOGGLE },
    fromUser: (user) => user?.notesAutoSaveInterval !== 0,
    toUser: (value, user) => {
      if (!value) return 0;
      return user?.notesAutoSaveInterval || AUTOSAVE_DEFAULT_MS;
    },
    sanitise: asBoolean,
  }),
  [QuickSettingId.SHOW_EMOJIS]: define<QuickSettingId.SHOW_EMOJIS, "showChecklistEmojis">({
    userKey: "showChecklistEmojis",
    tab: QuickTab.LISTS,
    labelKey: "quickSettings.labels.showEmojis",
    control: { kind: QuickControl.TOGGLE },
    fromUser: (user) => user?.showChecklistEmojis !== ToggleState.DISABLE,
    toUser: toToggle,
    sanitise: asBoolean,
  }),
  [QuickSettingId.COMPLETED_SUGGESTIONS]: define<
    QuickSettingId.COMPLETED_SUGGESTIONS,
    "showCompletedSuggestions"
  >({
    userKey: "showCompletedSuggestions",
    tab: QuickTab.LISTS,
    labelKey: "quickSettings.labels.completedSuggestions",
    control: { kind: QuickControl.TOGGLE },
    fromUser: (user) => user?.showCompletedSuggestions !== ToggleState.DISABLE,
    toUser: toToggle,
    sanitise: asBoolean,
  }),
};

export const QUICK_SETTING_IDS = Object.values(QuickSettingId);

export const QUICK_TABS = [QuickTab.APPEARANCE, QuickTab.NOTES, QuickTab.LISTS];

export const quickSettingsFor = (tab: QuickTab): QuickSettingId[] =>
  QUICK_SETTING_IDS.filter((id) => QUICK_SETTINGS[id].tab === tab);

export const accountValueOf = <K extends QuickSettingId>(
  id: K,
  user: AccountUser,
): QuickSettingValues[K] => (QUICK_SETTINGS[id] as QuickSettingDef<K, keyof User>).fromUser(user);

export const accountPatch = <K extends QuickSettingId>(
  id: K,
  value: QuickSettingValues[K],
  user: AccountUser,
): UserSettingsPatch => {
  const def = QUICK_SETTINGS[id] as QuickSettingDef<K, keyof User>;
  return { [def.userKey]: def.toUser(value, user) };
};

export const effectiveValue = <K extends QuickSettingId>(
  id: K,
  overrides: QuickOverrides,
  user: AccountUser,
): QuickSettingValues[K] => {
  const override = overrides[id];
  return override === undefined ? accountValueOf(id, user) : (override as QuickSettingValues[K]);
};

type IdsWith<V> = {
  [K in QuickSettingId]: QuickSettingValues[K] extends V ? K : never;
}[QuickSettingId];

export type SliderSettingId = IdsWith<number | null>;
export type ToggleSettingId = IdsWith<boolean>;

export const isSliderSetting = (id: QuickSettingId): id is SliderSettingId =>
  QUICK_SETTINGS[id].control.kind === QuickControl.SLIDER;

export const isToggleSetting = (id: QuickSettingId): id is ToggleSettingId =>
  QUICK_SETTINGS[id].control.kind === QuickControl.TOGGLE;

export const sliderOf = (id: SliderSettingId): SliderControl | null => {
  const { control } = QUICK_SETTINGS[id];
  return control.kind === QuickControl.SLIDER ? control : null;
};
