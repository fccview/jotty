"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Orbit01Icon, AlertCircleIcon } from "hugeicons-react";
import { useToast } from "@/app/_providers/ToastProvider";
import {
  getAppSettings,
  updateAppSettings,
} from "@/app/_server/actions/config";
import { useFaviconUpdate } from "@/app/_hooks/useFaviconUpdate";
import { ImageUpload } from "@/app/_components/GlobalComponents/FormElements/ImageUpload";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { AppSettings } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { MAX_FILE_SIZE } from "@/app/_consts/files";
import { Label } from "@/app/_components/GlobalComponents/FormElements/label";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";
import { useTranslations } from "next-intl";

export const AppSettingsTab = () => {
  const t = useTranslations();
  const { showToast } = useToast();
  const { updateFavicons } = useFaviconUpdate();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { isRwMarkable, user } = useAppMode();
  const isSuperAdmin = user?.isSuperAdmin || false;

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await getAppSettings();
        if (result.success && result.data) {
          setSettings(result.data);
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
          title: t("common.success"),
          message: t("admin.settingsSavedSuccessfully"),
        });
        setHasChanges(false);
        updateFavicons();
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

  const formFields = [
    {
      id: "appName",
      label: t("admin.applicationName"),
      description: t("admin.applicationNameDescription"),
      placeholder: isRwMarkable ? "rwMarkable" : "jotty·page",
    },
    {
      id: "appDescription",
      label: t("admin.applicationDescription"),
      description: t("admin.applicationDescriptionText"),
      placeholder: t("admin.applicationDescriptionPlaceholder"),
    },
  ] as const;

  const iconFields = [
    {
      label: t("admin.favicon16"),
      description: t("admin.favicon16Description"),
      iconType: "16x16Icon",
    },
    {
      label: t("admin.favicon32"),
      description: t("admin.favicon32Description"),
      iconType: "32x32Icon",
    },
    {
      label: t("admin.appleTouchIcon"),
      description: t("admin.appleTouchIconDescription"),
      iconType: "180x180Icon",
    },
    {
      label: t("admin.icon192"),
      description: t("admin.icon192Description"),
      iconType: "192x192Icon",
    },
    {
      label: t("admin.icon512"),
      description: t("admin.icon512Description"),
      iconType: "512x512Icon",
    },
  ] as const;

  return (
    <div className="space-y-6">
      {!isSuperAdmin && (
        <div className="bg-muted border border-border rounded-jotty p-4 flex items-start gap-3">
          <AlertCircleIcon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {t("admin.superAdminOnly")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("admin.viewOnlySettingsNotice")}
            </p>
          </div>
        </div>
      )}
      <div className="bg-background border border-border rounded-jotty p-6 space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          {formFields.map((field) => (
            <Input
              key={field.id}
              defaultValue={settings[field.id]}
              {...field}
              type="text"
              value={settings[field.id]}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              disabled={!isSuperAdmin}
            />
          ))}
        </div>
        <div>
          <Label htmlFor="notifyNewUpdates" className="block mb-3">
            {t("admin.notifyNewUpdates")}
          </Label>
          <Dropdown
            value={settings?.notifyNewUpdates || "yes"}
            onChange={(value) => handleInputChange("notifyNewUpdates", value)}
            options={[
              { id: "yes", name: t("common.yes") },
              { id: "no", name: t("common.no") },
            ]}
            disabled={!isSuperAdmin}
          />
        </div>
        <div>
          <Label htmlFor="parseContent" className="block mb-3">
            {t("admin.parseContent")}
          </Label>
          <Dropdown
            value={settings?.parseContent || "yes"}
            onChange={(value) => handleInputChange("parseContent", value)}
            options={[
              { id: "yes", name: t("common.yes") },
              { id: "no", name: t("common.no") },
            ]}
            disabled={!isSuperAdmin}
          />
          <span className="text-xs text-muted-foreground">
            {t("admin.parseContentEnabledDescription")} <br />
            {t("admin.parseContentDisabledDescription")}
            <br />
            <span className="font-bold">
              {t("admin.parseContentPerformanceWarning")}
            </span>
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Label htmlFor="adminContentAccess" className="block">
              {t("admin.adminContentAccess")}
            </Label>
            {!isSuperAdmin && (
              <span className="text-xs text-muted-foreground italic">
                ({t("admin.superAdminOnly")})
              </span>
            )}
          </div>
          <Dropdown
            value={settings?.adminContentAccess || "yes"}
            onChange={(value) => handleInputChange("adminContentAccess", value)}
            options={[
              { id: "yes", name: t("admin.adminContentAccessYes") },
              { id: "no", name: t("admin.adminContentAccessNo") },
            ]}
            disabled={!isSuperAdmin}
          />
          <span className="text-xs text-muted-foreground">
            {t("admin.adminContentAccessDescription")}
          </span>
        </div>
        <div>
          <Input
            label={t("admin.maximumFileUploadSize")}
            description={t("admin.maxFileSizeDescription")}
            type="number"
            id="maximumFileSize"
            defaultValue={
              settings?.maximumFileSize
                ? (settings.maximumFileSize / 1024 / 1024).toString()
                : (MAX_FILE_SIZE / 1024 / 1024).toString()
            }
            onChange={(e) =>
              handleInputChange(
                "maximumFileSize",
                (Number(e.target.value) * 1024 * 1024).toString()
              )
            }
            disabled={!isSuperAdmin}
          />
        </div>

        <div>
          <Input
            label={t("admin.maxLogAgeDays")}
            description={t("admin.maxLogAgeDaysDescription")}
            type="number"
            id="maxLogAgeDays"
            min="0"
            value={(settings?.maxLogAgeDays ?? 0).toString()}
            onChange={(e) => handleInputChange("maxLogAgeDays", e.target.value)}
            disabled={!isSuperAdmin}
            placeholder="0"
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">{t("admin.applicationIcons")}</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {iconFields.map((field) => (
              <ImageUpload
                key={field.iconType}
                {...field}
                currentUrl={settings[field.iconType]}
                onUpload={(iconType, url) =>
                  handleInputChange(iconType || "", url)
                }
                disabled={!isSuperAdmin}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-6 border-t">
          <Button onClick={handleSave} disabled={isSaving || !hasChanges || !isSuperAdmin}>
            {isSaving ? (
              <>
                <Logo className="h-4 w-4 bg-background mr-2 animate-pulse" pathClassName="fill-primary" />{t('common.saving')}</>
            ) : (
              t("admin.saveChanges")
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            disabled={isSaving || !hasChanges || !isSuperAdmin}
          >{t('common.reset')}</Button>
          {hasChanges && isSuperAdmin && (
            <p className="text-sm text-muted-foreground">
              {t("admin.unsavedChanges")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
