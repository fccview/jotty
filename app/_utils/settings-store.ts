import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAppMode } from '../_providers/AppModeProvider';

type BuiltInTheme = 'system' | 'light' | 'dark' | 'sunset' | 'ocean' | 'forest' | 'nord' | 'dracula' | 'monokai' | 'github-dark' | 'tokyo-night' | 'catppuccin' | 'rose-pine' | 'gruvbox' | 'solarized-dark'
type Theme = BuiltInTheme | string

const getSystemTheme = (isRwMarkable?: boolean): 'rwmarkable-light' | 'rwmarkable-dark' | 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    const dark = isRwMarkable ? 'rwmarkable-dark' : 'dark';
    const light = isRwMarkable ? 'rwmarkable-light' : 'light';

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? dark : light;
  }
  return isRwMarkable ? 'rwmarkable-light' : 'light';
};

interface SettingsState {
  theme: Theme
  showEmojis: boolean
  autosaveNotes: boolean
  showMarkdownPreview: boolean
  setTheme: (theme: Theme) => void
  setShowEmojis: (show: boolean) => void
  setAutosaveNotes: (enabled: boolean) => void
  setShowMarkdownPreview: (show: boolean) => void
  getResolvedTheme: (isRwMarkable?: boolean) => 'rwmarkable-light' | 'rwmarkable-dark' | 'light' | 'dark' | string
}

export const useSettings = create<SettingsState & { isRwMarkable?: boolean }>()(
  persist(
    (set, get) => ({
      theme: 'system',
      showEmojis: true,
      autosaveNotes: true,
      showMarkdownPreview: false,
      setTheme: (theme) => set({ theme }),
      setShowEmojis: (show) => set({ showEmojis: show }),
      setAutosaveNotes: (enabled) => set({ autosaveNotes: enabled }),
      setShowMarkdownPreview: (show) => set({ showMarkdownPreview: show }),
      getResolvedTheme: (isRwMarkable?: boolean) => {
        const { theme } = get();
        if (theme === 'system') {
          return getSystemTheme(isRwMarkable || false);
        }
        return theme;
      },
    }),
    {
      name: 'checklist-settings',
    }
  )
) 