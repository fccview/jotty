"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/app/_providers/ToastProvider";
import {
  getAppSettings,
  updateAppSettings,
} from "@/app/_server/actions/config";
import { useFaviconUpdate } from "@/app/_hooks/useFaviconUpdate";
import { ImageUpload } from "@/app/_components/GlobalComponents/FormElements/ImageUpload";
import { LoadingSpinner } from "@/app/_components/GlobalComponents/Layout/LoadingSpinner";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { AppSettings } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { MAX_FILE_SIZE } from "@/app/_consts/files";
import { useTranslations } from "next-intl";

export const AppSettingsTab = () => {
  const t = useTranslations();
  const { showToast } = useToast();
  const { updateFavicons } = useFaviconUpdate();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { isRwMarkable } = useAppMode();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await getAppSettings();
        if (result.success && result.data) {
          setSettings(result.data);
        } else {
          throw new Error(result.error || "Failed to load settings");
        }
      } catch (error) {
        showToast({
          type: "error",
          title: t("global.error"),
          message:
            error instanceof Error
              ? error.message
              : t("admin.settings.load_error"),
        });
      }
    };
    loadSettings();
  }, [showToast, t]);

  const handleInputChange = (field: string, value: string) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : null));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const formData = new FormData();
      Object.entries(settings).forEach(([key, value]) =>
        formData.append(key, value)
      );

      const result = await updateAppSettings(formData);
      if (result.success) {
        showToast({
          type: "success",
          title: t("global.success"),
          message: t("admin.settings.saved_success"),
        });
        setHasChanges(false);
        updateFavicons();
      } else {
        throw new Error(result.error || t("admin.settings.save_failed"));
      }
    } catch (error) {
      showToast({
        type: "error",
        title: t("global.error"),
        message:
          error instanceof Error ? error.message : t("global.unknown_error"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) return <LoadingSpinner />;

  const formFields = [
    {
      id: "appName",
      label: t("admin.settings.app_name"),
      description: t("admin.settings.app_name_description"),
      placeholder: isRwMarkable ? "rwMarkable" : "jotty·page",
    },
    {
      id: "appDescription",
      label: t("admin.settings.app_description"),
      description: t("admin.settings.app_description_description"),
      placeholder: "A simple, fast, and lightweight checklist...",
    },
  ] as const;

  const iconFields = [
    {
      label: t("admin.settings.favicon_16"),
      description: t("admin.settings.favicon_16_description"),
      iconType: "16x16Icon",
    },
    {
      label: t("admin.settings.favicon_32"),
      description: t("admin.settings.favicon_32_description"),
      iconType: "32x32Icon",
    },
    {
      label: t("admin.settings.favicon_180"),
      description: t("admin.settings.favicon_180_description"),
      iconType: "180x180Icon",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">{t("global.settings")}</h2>
        <p className="text-muted-foreground">
          {t("admin.settings.customize_app")}
        </p>
      </div>

      <div className="bg-background border border-border rounded-lg p-6 space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          {formFields.map((field) => (
            <Input
              key={field.id}
              defaultValue={settings[field.id]}
              {...field}
              type="text"
              value={settings[field.id]}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
            />
          ))}
        </div>
        <div>
          <label
            className="text-sm font-medium leading-none block mb-3"
            htmlFor="notifyNewUpdates"
          >
            {t("admin.settings.notify_updates")}
          </label>
          <Dropdown
            value={settings?.notifyNewUpdates || "yes"}
            onChange={(value) => handleInputChange("notifyNewUpdates", value)}
            options={[
              { id: "yes", name: t("global.yes") },
              { id: "no", name: t("global.no") },
            ]}
          />
        </div>
        <div>
          <Input
            label={t("admin.settings.max_file_size")}
            description={t("admin.settings.max_file_size_description")}
            type="number"
            id="maximumFileSize"
            defaultValue={(settings?.maximumFileSize ? (settings.maximumFileSize / 1024 / 1024).toString() : (MAX_FILE_SIZE / 1024 / 1024).toString())}
            onChange={(e) => handleInputChange("maximumFileSize", (Number(e.target.value) * 1024 * 1024).toString())}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">{t("admin.settings.app_icons")}</h3>
          <div className="grid gap-6 md:grid-cols-3">
            {iconFields.map((field) => (
              <ImageUpload
                key={field.iconType}
                {...field}
                currentUrl={settings[field.iconType]}
                onUpload={(iconType, url) =>
                  handleInputChange(iconType || "", url)
                }
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-6 border-t">
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("global.saving")}
              </>
            ) : (
              t("admin.settings.save_changes")
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            disabled={isSaving || !hasChanges}
          >
            {t("global.reset")}
          </Button>
          {hasChanges && (
            <p className="text-sm text-muted-foreground">
              {t("admin.settings.unsaved_changes")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
