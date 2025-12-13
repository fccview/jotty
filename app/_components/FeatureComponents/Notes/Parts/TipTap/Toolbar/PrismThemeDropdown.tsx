"use client";

import { Palette, ChevronDown } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { ToolbarDropdown } from "../Toolbar/ToolbarDropdown";
import { MarkdownTheme } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { updateUserSettings } from "@/app/_server/actions/users";
import { useToast } from "@/app/_providers/ToastProvider";
import { useRouter } from "next/navigation";

const themeOptions: { id: MarkdownTheme; name: string }[] = [
    { id: "prism", name: "Default" },
    { id: "prism-dark", name: "Dark" },
    { id: "prism-funky", name: "Funky" },
    { id: "prism-okaidia", name: "Okaidia" },
    { id: "prism-tomorrow", name: "Tomorrow" },
    { id: "prism-twilight", name: "Twilight" },
    { id: "prism-coy", name: "Coy" },
    { id: "prism-solarizedlight", name: "Solarized Light" },
];

interface PrismThemeDropdownProps {
    isMarkdownMode: boolean;
}

export const PrismThemeDropdown = ({ isMarkdownMode }: PrismThemeDropdownProps) => {
    const { user, setUser } = useAppMode();
    const { showToast } = useToast();
    const router = useRouter();
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
                    title: "Theme Updated",
                    message: "Theme updated successfully",
                });
                router.refresh();
            } else {
                showToast({
                    type: "error",
                    title: "Update Failed",
                    message: result.error || "Failed to update theme",
                });
            }
        } catch (error) {
            showToast({
                type: "error",
                title: "Update Failed",
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
            title="Syntax theme"
        >
            <Palette className="h-4 w-4" />
            <ChevronDown className="h-3 w-3" />
        </Button>
    );

    return (
        <ToolbarDropdown trigger={trigger} direction="right">
            <div className="flex-1 overflow-y-auto max-h-[300px]">
                {themeOptions.map((theme) => (
                    <button
                        key={theme.id}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent text-sm ${currentTheme === theme.id ? "bg-accent" : ""
                            }`}
                        onClick={() => handleThemeChange(theme.id)}
                    >
                        <span>{theme.name}</span>
                        {currentTheme === theme.id && (
                            <span className="ml-auto text-xs text-muted-foreground">✓</span>
                        )}
                    </button>
                ))}
            </div>
        </ToolbarDropdown>
    );
};

