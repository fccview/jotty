"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Orbit01Icon } from "hugeicons-react";
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
import { Label } from "@/app/_components/GlobalComponents/FormElements/label";

export const AppSettingsTab = () => {
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
          title: "Success",
          message: "Settings saved successfully.",
        });
        setHasChanges(false);
        updateFavicons();
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

  const formFields = [
    {
      id: "appName",
      label: "Application Name",
      description: "Appears in the browser tab and PWA name.",
      placeholder: isRwMarkable ? "rwMarkable" : "jotty·page",
    },
    {
      id: "appDescription",
      label: "Application Description",
      description: "Used for search engines and PWA description.",
      placeholder: "A simple, fast, and lightweight checklist...",
    },
  ] as const;

  const iconFields = [
    {
      label: "16x16 Favicon",
      description: "Small favicon for browser tabs.",
      iconType: "16x16Icon",
    },
    {
      label: "32x32 Favicon",
      description: "Standard favicon for most browsers.",
      iconType: "32x32Icon",
    },
    {
      label: "180x180 Apple Touch Icon",
      description: "Icon for iOS home screen.",
      iconType: "180x180Icon",
    },
    {
      label: "192x192 Icon",
      description: "Icon for Android home screen.",
      iconType: "192x192Icon",
    },
    {
      label: "512x512 Icon",
      description: "High-resolution icon for PWA splash screens.",
      iconType: "512x512Icon",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">Settings</h2>
        <p className="text-muted-foreground">
          Customize your application name, description, and icons.
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
          <Label htmlFor="notifyNewUpdates" className="block mb-3">
            Notify me of new updates
          </Label>
          <Dropdown
            value={settings?.notifyNewUpdates || "yes"}
            onChange={(value) => handleInputChange("notifyNewUpdates", value)}
            options={[
              { id: "yes", name: "Yes" },
              { id: "no", name: "No" },
            ]}
          />
        </div>
        <div>
          <Label htmlFor="parseContent" className="block mb-3">
            Always show parsed content
          </Label>
          <Dropdown
            value={settings?.parseContent || "yes"}
            onChange={(value) => handleInputChange("parseContent", value)}
            options={[
              { id: "yes", name: "Yes" },
              { id: "no", name: "No" },
            ]}
          />
          <span className="text-xs text-muted-foreground">
            When enabled this setting will show the parsed titles in the sidebar, search results, and overall across the app. <br />
            When disabled, the original file names will be sanitised, made human readable and shown instead.<br />
            <span className="font-bold">Setting this to &quot;no&quot; will improve performance on large datasets but may impact readability - especially on filenames with non latin characters.</span>
          </span>
        </div>
        <div>
          <Input
            label="Maximum file upload size"
            description="The maximum file size allowed for uploads in MB (applies to images, videos, and files)"
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
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Application Icons</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                <Orbit01Icon className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            disabled={isSaving || !hasChanges}
          >
            Reset
          </Button>
          {hasChanges && (
            <p className="text-sm text-muted-foreground">
              You have unsaved changes.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
