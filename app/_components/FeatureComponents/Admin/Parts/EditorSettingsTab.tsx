"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { LoadingSpinner } from "@/app/_components/GlobalComponents/Layout/LoadingSpinner";
import { useToast } from "@/app/_providers/ToastProvider";
import { AppSettings } from "@/app/_types";
import { getAppSettings, updateAppSettings } from "@/app/_server/actions/config";
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
                    const editorSettings = result.data.editor || {
                        enableSlashCommands: true,
                        enableBubbleMenu: true,
                        enableTableToolbar: true,
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

    const handleToggleChange = (field: keyof AppSettings["editor"], value: boolean) => {
        if (!settings) return;

        setSettings((prev) =>
            prev ? {
                ...prev,
                editor: {
                    ...prev.editor,
                    [field]: value,
                },
            } : null
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
                    title: t("global.success"),
                    message: t("admin.editor.saved_success"),
                });
                setHasChanges(false);
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

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">{t("admin.editor.editor_features")}</h3>
                        <p className="text-muted-foreground text-sm">
                            {t("admin.editor.configure_features")}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <label className="flex items-center justify-between cursor-pointer">
                            <div className="space-y-1">
                                <div className="text-sm font-medium">{t("admin.editor.slash_commands")}</div>
                                <p className="text-xs text-muted-foreground">
                                    {t("admin.editor.slash_commands_description")}
                                </p>
                            </div>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={settings.editor.enableSlashCommands}
                                    onChange={(e) => handleToggleChange("enableSlashCommands", e.target.checked)}
                                    className="sr-only"
                                />
                                <div
                                    className={`block w-10 h-6 rounded-full transition-colors ${settings.editor.enableSlashCommands ? "bg-primary" : "bg-muted"
                                        }`}
                                >
                                    <div
                                        className={`absolute left-1 top-1 bg-card w-4 h-4 rounded-full transition-transform ${settings.editor.enableSlashCommands ? "translate-x-4" : "translate-x-0"
                                            }`}
                                    />
                                </div>
                            </div>
                        </label>

                        <label className="flex items-center justify-between cursor-pointer">
                            <div className="space-y-1">
                                <div className="text-sm font-medium">{t("admin.editor.bubble_menu")}</div>
                                <p className="text-xs text-muted-foreground">
                                    {t("admin.editor.bubble_menu_description")}
                                </p>
                            </div>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={settings.editor.enableBubbleMenu}
                                    onChange={(e) => handleToggleChange("enableBubbleMenu", e.target.checked)}
                                    className="sr-only"
                                />
                                <div
                                    className={`block w-10 h-6 rounded-full transition-colors ${settings.editor.enableBubbleMenu ? "bg-primary" : "bg-muted"
                                        }`}
                                >
                                    <div
                                        className={`absolute left-1 top-1 bg-card w-4 h-4 rounded-full transition-transform ${settings.editor.enableBubbleMenu ? "translate-x-4" : "translate-x-0"
                                            }`}
                                    />
                                </div>
                            </div>
                        </label>

                        <label className="flex items-center justify-between cursor-pointer">
                            <div className="space-y-1">
                                <div className="text-sm font-medium">{t("admin.editor.table_toolbar")}</div>
                                <p className="text-xs text-muted-foreground">
                                    {t("admin.editor.table_toolbar_description")}
                                </p>
                            </div>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={settings.editor.enableTableToolbar}
                                    onChange={(e) => handleToggleChange("enableTableToolbar", e.target.checked)}
                                    className="sr-only"
                                />
                                <div
                                    className={`block w-10 h-6 rounded-full transition-colors ${settings.editor.enableTableToolbar ? "bg-primary" : "bg-muted"
                                        }`}
                                >
                                    <div
                                        className={`absolute left-1 top-1 bg-card w-4 h-4 rounded-full transition-transform ${settings.editor.enableTableToolbar ? "translate-x-4" : "translate-x-0"
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
                    {isSaving ? t("global.saving") : t("admin.settings.save_changes")}
                </Button>
            </div>
        </div>
    );
};
