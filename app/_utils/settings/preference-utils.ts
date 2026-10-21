import type { User, UserSettingsPatch } from "@/app/_types";
import type { DropdownOption } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { EDITABLE_SETTING_KEYS } from "@/app/_consts/user-settings";
import { KANBAN_COLUMN_WIDTH_AUTO, NOTE_FONT_SIZE_AUTO } from "@/app/_consts/styling";

export const DEFAULT_OPTION_ID = "__default__";

type Settings = Partial<User>;

const AUTO_VALUES: Partial<Record<keyof User, unknown>> = {
  notesFontSize: NOTE_FONT_SIZE_AUTO,
  kanbanColumnWidth: KANBAN_COLUMN_WIDTH_AUTO,
  quickCreateNotesCategory: "",
};

export const withDefaultOption = (options: DropdownOption[], name: string): DropdownOption[] => [
  { id: DEFAULT_OPTION_ID, name },
  ...options,
];

export const optionFromRaw = (
  options: DropdownOption[],
  raw: string,
): string | number | null => {
  if (raw === DEFAULT_OPTION_ID) return null;
  return options.find((option) => String(option.id) === raw)?.id ?? null;
};

export const storedSettingsOf = (user: Settings | null | undefined): Settings => {
  const stored: Settings = {};
  if (!user) return stored;
  EDITABLE_SETTING_KEYS.forEach((key) => {
    const value = user[key];
    if (value === undefined || value === null || value === AUTO_VALUES[key]) return;
    (stored[key] as unknown) = value;
  });
  return stored;
};

export const applyPatch = (settings: Settings, patch: UserSettingsPatch): Settings => {
  const next: Settings = { ...settings };
  (Object.keys(patch) as (keyof User)[]).forEach((key) => {
    const value = patch[key];
    if (value === null || value === undefined) {
      delete next[key];
    } else {
      (next[key] as unknown) = value;
    }
  });
  return next;
};

export const mergeIncoming = (
  incoming: Settings,
  local: Settings,
  keepLocal: (key: keyof User) => boolean,
): Settings => {
  const merged: Settings = { ...incoming };
  EDITABLE_SETTING_KEYS.forEach((key) => {
    if (!keepLocal(key)) return;
    if (local[key] === undefined) {
      delete merged[key];
    } else {
      (merged[key] as unknown) = local[key];
    }
  });
  return merged;
};
