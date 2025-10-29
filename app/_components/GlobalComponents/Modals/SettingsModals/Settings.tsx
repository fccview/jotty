"use client";

import {
  Settings,
  Save,
  Smile,
  FileText,
  ArrowLeftRight,
  ChevronsRightLeft,
  ChevronsLeftRight,
} from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { useSettings } from "@/app/_utils/settings-store";
import { useEffect, useState } from "react";
import { getAllThemes } from "@/app/_consts/themes";
import Link from "next/link";
import { useAppMode } from "@/app/_providers/AppModeProvider";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const { user } = useAppMode();
  const {
    theme,
    showEmojis,
    autosaveNotes,
    showMarkdownPreview,
    setTheme,
    setShowEmojis,
    setAutosaveNotes,
    setShowMarkdownPreview,
    setCompactMode,
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      titleIcon={<Settings className="h-5 w-5 text-muted-foreground" />}
    >
      <p className="text-sm text-muted-foreground mb-6">
        These options only apply to the current browser session. Please check
        your{" "}
        <Link href="/profile" className="text-primary hover:underline">
          account settings
        </Link>{" "}
        for permanent settings.
      </p>
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-3">Theme</h3>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading themes...</div>
        ) : (
          <Dropdown value={theme} options={themes} onChange={setTheme} />
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-medium mb-3">Notes</h3>
        <div className="space-y-3">
          {user?.notesAutoSaveInterval !== 0 && (
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Autosave Notes</span>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={autosaveNotes}
                  onChange={(e) => setAutosaveNotes(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`block w-10 h-6 rounded-full transition-colors ${
                    autosaveNotes ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <div
                    className={`absolute left-1 top-1 bg-card w-4 h-4 rounded-full transition-transform ${
                      autosaveNotes ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>
            </label>
          )}

          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Show Note Preview on Cards</span>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={showMarkdownPreview}
                onChange={(e) => setShowMarkdownPreview(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`block w-10 h-6 rounded-full transition-colors ${
                  showMarkdownPreview ? "bg-primary" : "bg-muted"
                }`}
              >
                <div
                  className={`absolute left-1 top-1 bg-card w-4 h-4 rounded-full transition-transform ${
                    showMarkdownPreview ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
            </div>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <ChevronsLeftRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Notes compact mode</span>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={compactMode}
                onChange={(e) => setCompactMode(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`block w-10 h-6 rounded-full transition-colors ${
                  compactMode ? "bg-primary" : "bg-muted"
                }`}
              >
                <div
                  className={`absolute left-1 top-1 bg-card w-4 h-4 rounded-full transition-transform ${
                    compactMode ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
            </div>
          </label>
        </div>

        <h3 className="text-sm font-medium mb-3 mt-6">Checklists</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <Smile className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Show Emojis on checklists</span>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={showEmojis}
                onChange={(e) => setShowEmojis(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`block w-10 h-6 rounded-full transition-colors ${
                  showEmojis ? "bg-primary" : "bg-muted"
                }`}
              >
                <div
                  className={`absolute left-1 top-1 bg-card w-4 h-4 rounded-full transition-transform ${
                    showEmojis ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
};
