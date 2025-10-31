"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { LoadingSpinner } from "@/app/_components/GlobalComponents/Layout/LoadingSpinner";
import { useToast } from "@/app/_providers/ToastProvider";
import { AppSettings } from "@/app/_types";
import {
  getAppSettings,
  updateAppSettings,
} from "@/app/_server/actions/config";

export const EditorSettingsTab = () => {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await getAppSettings();
        if (result.success && result.data) {
          const editorSettings = {
            enableSlashCommands:
              typeof result.data.editor?.enableSlashCommands === "boolean"
                ? result.data.editor?.enableSlashCommands
                : true,
            enableBubbleMenu:
              typeof result.data.editor?.enableBubbleMenu === "boolean"
                ? result.data.editor?.enableBubbleMenu
                : true,
            enableTableToolbar:
              typeof result.data.editor?.enableTableToolbar === "boolean"
                ? result.data.editor?.enableTableToolbar
                : true,
            enableBilateralLinks:
              typeof result.data.editor?.enableBilateralLinks === "boolean"
                ? result.data.editor?.enableBilateralLinks
                : true,
          };
          setSettings({
            ...result.data,
            editor: editorSettings,
          });
        } else {
          throw new Error(result.error || "Failed to load settings");
        }
      } catch (error) {
        showToast({
          type: "error",
          title: "Load Error",
          message:
            error instanceof Error
              ? error.message
              : "Could not fetch settings.",
        });
      }
    };
    loadSettings();
  }, [showToast]);

  const handleToggleChange = (
    field: keyof AppSettings["editor"],
    value: boolean
  ) => {
    if (!settings) return;

    setSettings((prev) =>
      prev
        ? {
            ...prev,
            editor: {
              ...prev.editor,
              [field]: value,
            },
          }
        : null
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const formData = new FormData();

      Object.entries(settings).forEach(([key, value]) => {
        if (key === "editor") {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });

      const result = await updateAppSettings(formData);
      if (result.success) {
        showToast({
          type: "success",
          title: "Success",
          message: "Editor settings saved successfully.",
        });
        setHasChanges(false);
      } else {
        throw new Error(result.error || "Failed to save settings");
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Save Error",
        message:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Editor Features</h3>
            <p className="text-muted-foreground text-sm">
              Configure which editor features are enabled for all users.
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-1">
                <div className="text-sm font-medium">Slash Commands</div>
                <p className="text-xs text-muted-foreground">
                  Enable the slash command menu (type &quot;/&quot; to insert
                  elements)
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.editor.enableSlashCommands}
                  onChange={(e) =>
                    handleToggleChange("enableSlashCommands", e.target.checked)
                  }
                  className="sr-only"
                />
                <div
                  className={`block w-10 h-6 rounded-full transition-colors ${
                    settings.editor.enableSlashCommands
                      ? "bg-primary"
                      : "bg-muted"
                  }`}
                >
                  <div
                    className={`absolute left-1 top-1 bg-card w-4 h-4 rounded-full transition-transform ${
                      settings.editor.enableSlashCommands
                        ? "translate-x-4"
                        : "translate-x-0"
                    }`}
                  />
                </div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-1">
                <div className="text-sm font-medium">Bubble Menu</div>
                <p className="text-xs text-muted-foreground">
                  Enable the floating toolbar that appears when text is selected
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.editor.enableBubbleMenu}
                  onChange={(e) =>
                    handleToggleChange("enableBubbleMenu", e.target.checked)
                  }
                  className="sr-only"
                />
                <div
                  className={`block w-10 h-6 rounded-full transition-colors ${
                    settings.editor.enableBubbleMenu ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <div
                    className={`absolute left-1 top-1 bg-card w-4 h-4 rounded-full transition-transform ${
                      settings.editor.enableBubbleMenu
                        ? "translate-x-4"
                        : "translate-x-0"
                    }`}
                  />
                </div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-1">
                <div className="text-sm font-medium">Table Toolbar</div>
                <p className="text-xs text-muted-foreground">
                  Enable the toolbar that appears when editing tables
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.editor.enableTableToolbar}
                  onChange={(e) =>
                    handleToggleChange("enableTableToolbar", e.target.checked)
                  }
                  className="sr-only"
                />
                <div
                  className={`block w-10 h-6 rounded-full transition-colors ${
                    settings.editor.enableTableToolbar
                      ? "bg-primary"
                      : "bg-muted"
                  }`}
                >
                  <div
                    className={`absolute left-1 top-1 bg-card w-4 h-4 rounded-full transition-transform ${
                      settings.editor.enableTableToolbar
                        ? "translate-x-4"
                        : "translate-x-0"
                    }`}
                  />
                </div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-1">
                <div className="text-sm font-medium">
                  Bilateral Links
                  <span className="ml-1 text-xs text-muted-foreground">
                    (Experimental)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enable the ability to link to notes and checklists in the same
                  document.
                  <span className="mt-1 block text-xs italic text-muted-foreground">
                    This feature is experimental and may not work as expected.
                    It may also end up being removed/deprecated in the future.
                  </span>
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.editor.enableBilateralLinks}
                  onChange={(e) =>
                    handleToggleChange("enableBilateralLinks", e.target.checked)
                  }
                  className="sr-only"
                />
                <div
                  className={`block w-10 h-6 rounded-full transition-colors ${
                    settings.editor.enableBilateralLinks
                      ? "bg-primary"
                      : "bg-muted"
                  }`}
                >
                  <div
                    className={`absolute left-1 top-1 bg-card w-4 h-4 rounded-full transition-transform ${
                      settings.editor.enableBilateralLinks
                        ? "translate-x-4"
                        : "translate-x-0"
                    }`}
                  />
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="min-w-24"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};
