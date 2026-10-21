import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  QuickOverrides,
  QuickSettingId,
  QuickSettingValues,
  SETTINGS_STORAGE_KEY,
  SETTINGS_STORE_VERSION,
  SYSTEM_THEME,
} from "@/app/_consts/quick-settings";
import { migrateSettings } from "@/app/_utils/settings/quick-settings-migrate";

type BuiltInTheme =
  | "system"
  | "light"
  | "dark"
  | "sunset"
  | "ocean"
  | "forest"
  | "nord"
  | "dracula"
  | "monokai"
  | "github-dark"
  | "tokyo-night"
  | "catppuccin"
  | "rose-pine"
  | "gruvbox"
  | "solarized-dark"
  | "sakura-red"
  | "sakura-blue";
type Theme = BuiltInTheme | string;

const getSystemTheme = (
  isRwMarkable?: boolean
): "rwmarkable-light" | "rwmarkable-dark" | "light" | "dark" => {
  if (typeof window !== "undefined") {
    const dark = isRwMarkable ? "rwmarkable-dark" : "dark";
    const light = isRwMarkable ? "rwmarkable-light" : "light";

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? dark
      : light;
  }
  return isRwMarkable ? "rwmarkable-light" : "light";
};

interface SettingsState {
  overrides: QuickOverrides;
  setOverride: <K extends QuickSettingId>(id: K, value: QuickSettingValues[K]) => void;
  clearOverride: (id: QuickSettingId) => void;
  getResolvedTheme: (
    isRwMarkable: boolean,
    userPreferredTheme?: string
  ) => "rwmarkable-light" | "rwmarkable-dark" | "light" | "dark" | string;
}

export const resolveTheme = (
  theme: Theme,
  isRwMarkable: boolean,
): "rwmarkable-light" | "rwmarkable-dark" | "light" | "dark" | string =>
  theme && theme !== SYSTEM_THEME ? theme : getSystemTheme(isRwMarkable);

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      overrides: {},
      setOverride: (id, value) =>
        set((state) => ({ overrides: { ...state.overrides, [id]: value } })),
      clearOverride: (id) =>
        set((state) => {
          const rest = { ...state.overrides };
          delete rest[id];
          return { overrides: rest };
        }),
      getResolvedTheme: (isRwMarkable, userPreferredTheme) => {
        const local = get().overrides[QuickSettingId.THEME];
        return resolveTheme(local ?? userPreferredTheme ?? SYSTEM_THEME, isRwMarkable);
      },
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: SETTINGS_STORE_VERSION,
      partialize: (state) => ({ overrides: state.overrides }),
      migrate: (persisted, version) => migrateSettings(persisted, version),
    }
  )
);
