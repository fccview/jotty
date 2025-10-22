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
      placeholder: isRwMarkable
        ? "rwMarkable"
        : "jotty·page",
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
          <h3 className="text-lg font-semibold mb-4">Application Icons</h3>
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
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
