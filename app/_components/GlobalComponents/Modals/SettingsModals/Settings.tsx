"use client";

import {
  FloppyDiskIcon,
  SmileIcon,
  File02Icon,
  ArrowHorizontalIcon,
  CheckmarkSquare04Icon,
  SchoolReportCardIcon,
  ListViewIcon,
  GridViewIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { useSettings } from "@/app/_utils/settings-store";
import { useEffect, useState } from "react";
import { getAllThemes } from "@/app/_consts/themes";
import Link from "next/link";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useTranslations } from "next-intl";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const t = useTranslations();
  const { user } = useAppMode();
  const {
    theme,
    showEmojis,
    autosaveNotes,
    showMarkdownPreview,
    showCompletedSuggestions,
    viewMode,
    setTheme,
    setShowEmojis,
    setAutosaveNotes,
    setShowMarkdownPreview,
    setShowCompletedSuggestions,
    setCompactMode,
    setViewMode,
    compactMode,
  } = useSettings();
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadThemes = async () => {
      try {
        const allThemes = await getAllThemes();
        setThemes(allThemes);
      } catch (error) {
        console.error("Failed to load themes:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadThemes();
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('profile.quickSettingsHeader')}>
      <p className="text-sm text-muted-foreground mb-6">
        {t('settingsModal.sessionOnlyPrefix')}{' '}
        <Link href="/settings/user-preferences" className="text-primary hover:underline">{t('settingsModal.accountSettings')}</Link>.
      </p>
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-3">{t('common.theme')}</h3>
        {loading ? (
          <div className="text-sm text-muted-foreground">{t('settings.loadingThemes')}</div>
        ) : (
          <Dropdown value={theme} options={themes} onChange={setTheme} />
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-medium mb-3">{t('settingsModal.viewMode')}</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setViewMode('card')}
            className={`flex flex-col items-center gap-2 p-3 rounded-md border transition-all ${viewMode === 'card' ? 'border-primary color-primary' : 'border-border hover:border-primary/50'
              }`}
          >
            <SchoolReportCardIcon className="h-5 w-5" />
            <span className="text-xs font-medium">{t('settingsModal.viewModeCard')}</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex flex-col items-center gap-2 p-3 rounded-md border transition-all ${viewMode === 'list' ? 'border-primary color-primary' : 'border-border hover:border-primary/50'
              }`}
          >
            <ListViewIcon className="h-5 w-5" />
            <span className="text-xs font-medium">{t('settingsModal.viewModeList')}</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex flex-col items-center gap-2 p-3 rounded-md border transition-all ${viewMode === 'grid' ? 'border-primary color-primary' : 'border-border hover:border-primary/50'
              }`}
          >
            <GridViewIcon className="h-5 w-5" />
            <span className="text-xs font-medium">{t('settingsModal.viewModeGrid')}</span>
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-medium mb-3">{t('notes.title')}</h3>
        <div className="space-y-3">
          {user?.notesAutoSaveInterval !== 0 && (
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <FloppyDiskIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t('settingsModal.autosaveNotes')}</span>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={autosaveNotes}
                  onChange={(e) => setAutosaveNotes(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`block w-10 h-6 rounded-full transition-colors ${autosaveNotes ? "bg-primary" : "bg-muted"
                    }`}
                >
                  <div
                    className={`absolute left-1 top-1 bg-card w-4 h-4 rounded-full transition-transform ${autosaveNotes ? "translate-x-4" : "translate-x-0"
                      }`}
                  />
                </div>
              </div>
            </label>
          )}

          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <File02Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{t('settingsModal.showNotePreview')}</span>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={showMarkdownPreview}
                onChange={(e) => setShowMarkdownPreview(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`block w-10 h-6 rounded-full transition-colors ${showMarkdownPreview ? "bg-primary" : "bg-muted"
                  }`}
              >
                <div
                  className={`absolute left-1 top-1 bg-card w-4 h-4 rounded-full transition-transform ${showMarkdownPreview ? "translate-x-4" : "translate-x-0"
                    }`}
                />
              </div>
            </div>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <ArrowHorizontalIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{t('settingsModal.notesCompactMode')}</span>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={compactMode}
                onChange={(e) => setCompactMode(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`block w-10 h-6 rounded-full transition-colors ${compactMode ? "bg-primary" : "bg-muted"
                  }`}
              >
                <div
                  className={`absolute left-1 top-1 bg-card w-4 h-4 rounded-full transition-transform ${compactMode ? "translate-x-4" : "translate-x-0"
                    }`}
                />
              </div>
            </div>
          </label>
        </div>

        <h3 className="text-sm font-medium mb-3 mt-6">{t('checklists.title')}</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <SmileIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{t('settingsModal.showEmojis')}</span>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={showEmojis}
                onChange={(e) => setShowEmojis(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`block w-10 h-6 rounded-full transition-colors ${showEmojis ? "bg-primary" : "bg-muted"
                  }`}
              >
                <div
                  className={`absolute left-1 top-1 bg-card w-4 h-4 rounded-full transition-transform ${showEmojis ? "translate-x-4" : "translate-x-0"
                    }`}
                />
              </div>
            </div>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <CheckmarkSquare04Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {t('settings.showCompletedSuggestions')}
              </span>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={showCompletedSuggestions}
                onChange={(e) => setShowCompletedSuggestions(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`block w-10 h-6 rounded-full transition-colors ${showCompletedSuggestions ? "bg-primary" : "bg-muted"
                  }`}
              >
                <div
                  className={`absolute left-1 top-1 bg-card w-4 h-4 rounded-full transition-transform ${showCompletedSuggestions ? "translate-x-4" : "translate-x-0"
                    }`}
                />
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onClose}>{t('common.done')}</Button>
      </div>
    </Modal>
  );
};
