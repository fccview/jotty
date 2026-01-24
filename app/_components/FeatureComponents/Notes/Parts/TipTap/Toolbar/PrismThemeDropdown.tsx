"use client";

import { PaintBrush04Icon, ArrowDown01Icon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { ToolbarDropdown } from "../Toolbar/ToolbarDropdown";
import { MarkdownTheme } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { updateUserSettings } from "@/app/_server/actions/users";
import { useToast } from "@/app/_providers/ToastProvider";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const themeOptions = (t: any): { id: MarkdownTheme; name: string }[] => [
    { id: "prism", name: t("settings.default") },
    { id: "prism-dark", name: t("settings.dark") },
    { id: "prism-funky", name: t("settings.funky") },
    { id: "prism-okaidia", name: t("settings.okaidia") },
    { id: "prism-tomorrow", name: t("settings.tomorrow") },
    { id: "prism-twilight", name: t("settings.twilight") },
    { id: "prism-coy", name: t("settings.coy") },
    { id: "prism-solarizedlight", name: t("settings.solarizedLight") },
];

interface PrismThemeDropdownProps {
    isMarkdownMode: boolean;
}

export const PrismThemeDropdown = ({ isMarkdownMode }: PrismThemeDropdownProps) => {
    const { user, setUser } = useAppMode();
    const { showToast } = useToast();
    const router = useRouter();
    const t = useTranslations();
    const currentTheme = user?.markdownTheme || "prism";

    if (!isMarkdownMode) return null;

    const handleThemeChange = async (theme: MarkdownTheme) => {
        if (!user) return;

        try {
            const result = await updateUserSettings({
                markdownTheme: theme,
            });

            if (result.success && result.data?.user) {
                setUser({ ...user, ...result.data.user });
                showToast({
                    type: "success",
                    title: t("editor.themeUpdated"),
                    message: "Theme updated successfully",
                });
                router.refresh();
            } else {
                showToast({
                    type: "error",
                    title: t("editor.updateFailed"),
                    message: result.error || "Failed to update theme",
                });
            }
        } catch (error) {
            showToast({
                type: "error",
                title: t("editor.updateFailed"),
                message: "Failed to update theme",
            });
        }
    };

    const trigger = (
        <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            className="flex items-center gap-1"
            title={t("editor.syntaxTheme")}
        >
            <PaintBrush04Icon className="h-4 w-4" />
            <ArrowDown01Icon className="h-3 w-3" />
        </Button>
    );

    return (
        <ToolbarDropdown trigger={trigger} direction="right">
            <div className="flex-1 overflow-y-auto max-h-[300px]">
                {themeOptions(t).map((theme) => (
                    <button
                        key={theme.id}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent text-md lg:text-sm ${currentTheme === theme.id ? "bg-accent" : ""
                            }`}
                        onClick={() => handleThemeChange(theme.id)}
                    >
                        <span>{theme.name}</span>
                    </button>
                ))}
            </div>
        </ToolbarDropdown>
    );
};

