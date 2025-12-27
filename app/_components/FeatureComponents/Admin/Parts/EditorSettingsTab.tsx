"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { Toggle } from "@/app/_components/GlobalComponents/FormElements/Toggle";
import { useToast } from "@/app/_providers/ToastProvider";
import { AppSettings } from "@/app/_types";
import {
  getAppSettings,
  updateAppSettings,
} from "@/app/_server/actions/config";
import { useTranslations } from "next-intl";

export const EditorSettingsTab = () => {
  const t = useTranslations();
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
            drawioUrl: result.data.editor?.drawioUrl || "",
            drawioProxyEnabled:
              typeof result.data.editor?.drawioProxyEnabled === "boolean"
                ? result.data.editor?.drawioProxyEnabled
                : false,
          };
          setSettings({
            ...result.data,
            editor: editorSettings,
          });
        } else {
          throw new Error(result.error || t("admin.failedToLoadSettings"));
        }
      } catch (error) {
        showToast({
          type: "error",
          title: t("admin.loadError"),
          message:
            error instanceof Error
              ? error.message
              : t("admin.couldNotFetchSettings"),
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

  const handleInputChange = (
    field: keyof AppSettings["editor"],
    value: string
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
          title: t("common.success"),
          message: t("admin.editorSettingsSaved"),
        });
        setHasChanges(false);
      } else {
        throw new Error(result.error || t("admin.failedToSaveSettings"));
      }
    } catch (error) {
      showToast({
        type: "error",
        title: t("admin.saveError"),
        message:
          error instanceof Error ? error.message : t("admin.unknownErrorOccurred"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) return;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-jotty p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">{t('editor.editorFeatures')}</h3>
            <p className="text-muted-foreground text-sm">
              {t("admin.configureEditorFeatures")}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="enableSlashCommands" className="space-y-1 cursor-pointer">
                <div className="text-sm font-medium">{t('editor.slashCommands')}</div>
                <p className="text-xs text-muted-foreground">
                  {t("admin.enableSlashCommandsDescription")}
                </p>
              </label>
              <Toggle
                id="enableSlashCommands"
                checked={settings.editor.enableSlashCommands}
                onCheckedChange={(checked) =>
                  handleToggleChange("enableSlashCommands", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="enableBubbleMenu" className="space-y-1 cursor-pointer">
                <div className="text-sm font-medium">{t('editor.bubbleMenu')}</div>
                <p className="text-xs text-muted-foreground">
                  {t("admin.enableBubbleMenuDescription")}
                </p>
              </label>
              <Toggle
                id="enableBubbleMenu"
                checked={settings.editor.enableBubbleMenu}
                onCheckedChange={(checked) =>
                  handleToggleChange("enableBubbleMenu", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="enableTableToolbar" className="space-y-1 cursor-pointer">
                <div className="text-sm font-medium">{t('editor.tableToolbar')}</div>
                <p className="text-xs text-muted-foreground">
                  {t("admin.enableTableToolbarDescription")}
                </p>
              </label>
              <Toggle
                id="enableTableToolbar"
                checked={settings.editor.enableTableToolbar}
                onCheckedChange={(checked) =>
                  handleToggleChange("enableTableToolbar", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="enableBilateralLinks" className="space-y-1 cursor-pointer">
                <div className="text-sm font-medium">
                  {t("admin.bilateralLinks")}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {t("admin.experimental")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("admin.bilateralLinksDescription")}
                  <span className="mt-1 block text-xs italic text-muted-foreground">
                    {t("admin.bilateralLinksWarning")}
                  </span>
                </p>
              </label>
              <Toggle
                id="enableBilateralLinks"
                checked={settings.editor.enableBilateralLinks}
                onCheckedChange={(checked) =>
                  handleToggleChange("enableBilateralLinks", checked)
                }
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="text-lg font-semibold mb-2">{t('editor.externalServices')}</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {t("admin.configureExternalServices")}
            </p>

            <div className="space-y-4">
              <label className="block">
                <div className="text-sm font-medium mb-1">
                  {t("admin.drawioUrl")}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {t("admin.optional")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {t("admin.drawioUrlDescription")}
                  <span className="mt-1 block text-xs italic">
                    {t("admin.drawioUrlExample")}
                  </span>
                </p>
                <Input
                  id="drawioUrl"
                  type="text"
                  value={settings.editor.drawioUrl || ""}
                  onChange={(e) =>
                    handleInputChange("drawioUrl", e.target.value)
                  }
                  placeholder="https://embed.diagrams.net"
                  className="w-full"
                />
              </label>

              <div className="flex items-center justify-between">
                <label htmlFor="drawioProxyEnabled" className="space-y-1 cursor-pointer">
                  <div className="text-sm font-medium">{t("admin.drawioProxyEnabled")}</div>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.drawioProxyEnabledDescription")}
                  </p>
                </label>
                <Toggle
                  id="drawioProxyEnabled"
                  checked={settings.editor.drawioProxyEnabled || false}
                  onCheckedChange={(checked) =>
                    handleToggleChange("drawioProxyEnabled", checked)
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="min-w-24"
        >
          {isSaving ? t("admin.saving") : t("admin.saveChanges")}
        </Button>
      </div>
    </div>
  );
};
