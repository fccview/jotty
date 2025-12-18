import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  theme: Theme;
  showEmojis: boolean;
  autosaveNotes: boolean;
  showMarkdownPreview: boolean;
  showCompletedSuggestions: boolean;
  setTheme: (theme: Theme) => void;
  setShowEmojis: (show: boolean) => void;
  setAutosaveNotes: (enabled: boolean) => void;
  setShowMarkdownPreview: (show: boolean) => void;
  setShowCompletedSuggestions: (show: boolean) => void;
  setCompactMode: (compact: boolean) => void;
  getResolvedTheme: (
    isRwMarkable: boolean,
    userPreferredTheme?: string
  ) => "rwmarkable-light" | "rwmarkable-dark" | "light" | "dark" | string;
  compactMode: boolean;
}

export const useSettings = create<SettingsState & { isRwMarkable?: boolean }>()(
  persist(
    (set, get) => ({
      theme: "system",
      showEmojis: true,
      autosaveNotes: true,
      showMarkdownPreview: false,
      showCompletedSuggestions: true,
      compactMode: false,
      setTheme: (theme) => set({ theme }),
      setShowEmojis: (show) => set({ showEmojis: show }),
      setAutosaveNotes: (enabled) => set({ autosaveNotes: enabled }),
      setShowMarkdownPreview: (show) => set({ showMarkdownPreview: show }),
      setShowCompletedSuggestions: (show) =>
        set({ showCompletedSuggestions: show }),
      setCompactMode: (compact) => set({ compactMode: compact }),
      getResolvedTheme: (
        isRwMarkable: boolean,
        userPreferredTheme?: string
      ) => {
        const { theme: localStorageTheme } = get();

        if (localStorageTheme && localStorageTheme !== "system") {
          return localStorageTheme;
        } else if (userPreferredTheme && userPreferredTheme !== "system") {
          return userPreferredTheme;
        } else if (
          localStorageTheme === "system" ||
          userPreferredTheme === "system"
        ) {
          return getSystemTheme(isRwMarkable);
        } else {
          return isRwMarkable ? "rwmarkable-light" : "light";
        }
      },
    }),
    {
      name: "checklist-settings",
    }
  )
);
