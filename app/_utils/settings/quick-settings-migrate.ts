import {
  QUICK_SETTINGS,
  QUICK_SETTING_IDS,
  QuickOverrides,
  QuickSettingId,
  SETTINGS_STORE_VERSION,
  SYSTEM_THEME,
} from "@/app/_consts/quick-settings";
import { DEFAULT_VIEW_MODE } from "@/app/_consts/view-modes";

const LEGACY_DEFAULTS: Partial<Record<QuickSettingId, unknown>> = {
  [QuickSettingId.THEME]: SYSTEM_THEME,
  [QuickSettingId.BORDER_RADIUS]: null,
  [QuickSettingId.NOTE_FONT_SIZE]: null,
  [QuickSettingId.KANBAN_COLUMN_WIDTH]: null,
  [QuickSettingId.VIEW_MODE]: DEFAULT_VIEW_MODE,
  [QuickSettingId.CARD_PREVIEW]: false,
  [QuickSettingId.COMPACT_MODE]: false,
  [QuickSettingId.AUTOSAVE]: true,
  [QuickSettingId.SHOW_EMOJIS]: null,
  [QuickSettingId.COMPLETED_SUGGESTIONS]: true,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const keepOverride = (
  overrides: QuickOverrides,
  id: QuickSettingId,
  raw: unknown,
) => {
  const clean = QUICK_SETTINGS[id].sanitise(raw);
  if (clean === undefined || clean === null) return;
  (overrides as Record<QuickSettingId, unknown>)[id] = clean;
};

export const cleanOverrides = (raw: unknown): QuickOverrides => {
  const overrides: QuickOverrides = {};
  if (!isRecord(raw)) return overrides;

  for (const id of QUICK_SETTING_IDS) {
    if (raw[id] !== undefined) keepOverride(overrides, id, raw[id]);
  }

  return overrides;
};

export const legacyOverrides = (raw: unknown): QuickOverrides => {
  const overrides: QuickOverrides = {};
  if (!isRecord(raw)) return overrides;

  for (const id of QUICK_SETTING_IDS) {
    const value = raw[id];
    if (value === undefined || value === LEGACY_DEFAULTS[id]) continue;
    keepOverride(overrides, id, value);
  }

  return overrides;
};

export const migrateSettings = (
  persisted: unknown,
  version: number,
): { overrides: QuickOverrides } => {
  if (version >= SETTINGS_STORE_VERSION) {
    return {
      overrides: cleanOverrides(isRecord(persisted) ? persisted.overrides : undefined),
    };
  }

  const legacy = isRecord(persisted) ? { ...persisted } : {};
  if (version < 1) delete legacy[QuickSettingId.SHOW_EMOJIS];
  return { overrides: legacyOverrides(legacy) };
};
