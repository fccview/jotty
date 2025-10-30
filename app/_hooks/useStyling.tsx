import { useState, useEffect } from "react";
import { useToast } from "@/app/_providers/ToastProvider";
import { loadCustomCSS, saveCustomCSS, loadCustomThemes, saveCustomThemes } from "@/app/_server/actions/config";
import { getAllThemes } from "@/app/_consts/themes";

interface ThemeFormData {
    name: string;
    icon: string;
    colors: {
        "--background": string;
        "--foreground": string;
        "--card": string;
        "--card-foreground": string;
        "--popover": string;
        "--popover-foreground": string;
        "--primary": string;
        "--primary-foreground": string;
        "--secondary": string;
        "--secondary-foreground": string;
        "--muted": string;
        "--muted-foreground": string;
        "--accent": string;
        "--accent-foreground": string;
        "--destructive": string;
        "--destructive-foreground": string;
        "--border": string;
        "--input": string;
        "--ring": string;
    };
}

export const useStyling = () => {
    const { showToast } = useToast();

    const [css, setCss] = useState("");
    const [isLoadingCss, setIsLoadingCss] = useState(true);
    const [isSavingCss, setIsSavingCss] = useState(false);
    const [hasCssChanges, setHasCssChanges] = useState(false);

    const [themes, setThemes] = useState<any[]>([]);
    const [isLoadingThemes, setIsLoadingThemes] = useState(true);
    const [isSavingThemes, setIsSavingThemes] = useState(false);
    const [themeModalOpen, setThemeModalOpen] = useState(false);
    const [editingTheme, setEditingTheme] = useState<string | null>(null);
    const [themeForm, setThemeForm] = useState<ThemeFormData>({
        name: "",
        icon: "Palette",
        colors: {
            "--background": "",
            "--foreground": "",
            "--card": "",
            "--card-foreground": "",
            "--popover": "",
            "--popover-foreground": "",
            "--primary": "",
            "--primary-foreground": "",
            "--secondary": "",
            "--secondary-foreground": "",
            "--muted": "",
            "--muted-foreground": "",
            "--accent": "",
            "--accent-foreground": "",
            "--destructive": "",
            "--destructive-foreground": "",
            "--border": "",
            "--input": "",
            "--ring": ""
        },
    });

    useEffect(() => {
        const loadCss = async () => {
            try {
                const result = await loadCustomCSS();
                if (result.success) {
                    setCss(result.data || "");
                } else {
                    showToast({
                        type: "error",
                        title: "Load Error",
                        message: result.error || "Failed to load custom CSS",
                    });
                }
            } catch (error) {
                showToast({
                    type: "error",
                    title: "Load Error",
                    message: "Could not load custom CSS.",
                });
            } finally {
                setIsLoadingCss(false);
            }
        };

        const loadThemes = async () => {
            try {
                const allThemes = await getAllThemes();
                setThemes(allThemes);
            } catch (error) {
                showToast({
                    type: "error",
                    title: "Load Error",
                    message: "Could not load themes.",
                });
            } finally {
                setIsLoadingThemes(false);
            }
        };

        loadCss();
        loadThemes();
    }, [showToast]);

    // Load raw theme config for editing
    const loadRawThemeConfig = async () => {
        try {
            return await loadCustomThemes();
        } catch (error) {
            console.error("Failed to load raw theme config:", error);
            return null;
        }
    };

    const hexToRgb = (hex: string): string => {
        hex = hex.replace('#', '');

        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }

        if (hex.length === 6) {
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return `${r} ${g} ${b}`;
        }

        return hex;
    };

    const handleCssChange = (newCss: string) => {
        setCss(newCss);
        setHasCssChanges(true);
    };

    const handleSaveCss = async () => {
        setIsSavingCss(true);
        try {
            const result = await saveCustomCSS(css);
            if (result.success) {
                showToast({
                    type: "success",
                    title: "Success",
                    message: "Custom CSS saved successfully.",
                });
                setHasCssChanges(false);
                // Notify ThemeProvider to reload CSS
                window.dispatchEvent(new CustomEvent('css-updated'));
            } else {
                throw new Error(result.error || "Failed to save CSS");
            }
        } catch (error) {
            showToast({
                type: "error",
                title: "Save Error",
                message: error instanceof Error ? error.message : "An unknown error occurred.",
            });
        } finally {
            setIsSavingCss(false);
        }
    };

    const handleCreateTheme = () => {
        setEditingTheme(null);
        setThemeForm({
            name: "",
            icon: "Palette",
            colors: {
                "--background": "",
                "--foreground": "",
                "--card": "",
                "--card-foreground": "",
                "--popover": "",
                "--popover-foreground": "",
                "--primary": "",
                "--primary-foreground": "",
                "--secondary": "",
                "--secondary-foreground": "",
                "--muted": "",
                "--muted-foreground": "",
                "--accent": "",
                "--accent-foreground": "",
                "--destructive": "",
                "--destructive-foreground": "",
                "--border": "",
                "--input": "",
                "--ring": ""
            },
        });
        setThemeModalOpen(true);
    };

    const handleEditTheme = async (themeId: string) => {
        const rawConfig = await loadRawThemeConfig();
        if (!rawConfig || !rawConfig["custom-themes"] || !rawConfig["custom-themes"][themeId]) {
            showToast({
                type: "error",
                title: "Error",
                message: "Theme not found.",
            });
            return;
        }

        const theme = rawConfig["custom-themes"][themeId];
        setEditingTheme(themeId);

        const processedColors = { ...theme.colors };
        Object.keys(processedColors).forEach(key => {
            const value = processedColors[key];
            if (value && value.startsWith('#')) {
                processedColors[key] = hexToRgb(value);
            }
        });

        setThemeForm({
            name: theme.name,
            icon: theme.icon || "Palette",
            colors: {
                "--background": processedColors["--background"] || "",
                "--foreground": processedColors["--foreground"] || "",
                "--card": processedColors["--card"] || "",
                "--card-foreground": processedColors["--card-foreground"] || "",
                "--popover": processedColors["--popover"] || "",
                "--popover-foreground": processedColors["--popover-foreground"] || "",
                "--primary": processedColors["--primary"] || "",
                "--primary-foreground": processedColors["--primary-foreground"] || "",
                "--secondary": processedColors["--secondary"] || "",
                "--secondary-foreground": processedColors["--secondary-foreground"] || "",
                "--muted": processedColors["--muted"] || "",
                "--muted-foreground": processedColors["--muted-foreground"] || "",
                "--accent": processedColors["--accent"] || "",
                "--accent-foreground": processedColors["--accent-foreground"] || "",
                "--destructive": processedColors["--destructive"] || "",
                "--destructive-foreground": processedColors["--destructive-foreground"] || "",
                "--border": processedColors["--border"] || "",
                "--input": processedColors["--input"] || "",
                "--ring": processedColors["--ring"] || ""
            },
        });
        setThemeModalOpen(true);
    };

    const handleDeleteTheme = async (themeId: string) => {
        try {
            const config = await loadCustomThemes();
            const customThemes = config?.["custom-themes"] || {};

            if (!customThemes[themeId]) {
                showToast({
                    type: "error",
                    title: "Error",
                    message: "Theme not found.",
                });
                return;
            }

            delete customThemes[themeId];

            const result = await saveCustomThemes({ "custom-themes": customThemes });
            if (result.success) {
                showToast({
                    type: "success",
                    title: "Success",
                    message: "Theme deleted successfully.",
                });

                const allThemes = await getAllThemes();
                setThemes(allThemes);
            } else {
                throw new Error(result.error || "Failed to delete theme");
            }
        } catch (error) {
            showToast({
                type: "error",
                title: "Delete Error",
                message: error instanceof Error ? error.message : "An unknown error occurred.",
            });
        }
    };

    const handleSaveTheme = async () => {
        if (!themeForm.name.trim()) {
            showToast({
                type: "error",
                title: "Validation Error",
                message: "Theme name is required.",
            });
            return;
        }

        setIsSavingThemes(true);
        try {
            const config = await loadCustomThemes();
            const customThemes = config?.["custom-themes"] || {};

            const processedColors = { ...themeForm.colors };
            Object.keys(processedColors).forEach(key => {
                const value = processedColors[key as keyof typeof processedColors];
                if (value && value.startsWith('#')) {
                    processedColors[key as keyof typeof processedColors] = hexToRgb(value);
                }
            });

            const themeId = editingTheme || themeForm.name.toLowerCase().replace(/\s+/g, '-');
            customThemes[themeId] = {
                name: themeForm.name,
                icon: themeForm.icon,
                colors: processedColors,
            };

            const result = await saveCustomThemes({ "custom-themes": customThemes });
            if (result.success) {
                showToast({
                    type: "success",
                    title: "Success",
                    message: `Theme ${editingTheme ? 'updated' : 'created'} successfully.`,
                });
                setThemeModalOpen(false);
                const allThemes = await getAllThemes();
                setThemes(allThemes);
            } else {
                throw new Error(result.error || "Failed to save theme");
            }
        } catch (error) {
            showToast({
                type: "error",
                title: "Save Error",
                message: error instanceof Error ? error.message : "An unknown error occurred.",
            });
        } finally {
            setIsSavingThemes(false);
        }
    };

    const handleThemeFormChange = (field: string, value: string) => {
        if (field === 'name' || field === 'icon') {
            setThemeForm(prev => ({ ...prev, [field]: value }));
        } else {
            let processedValue = value;
            if (value.startsWith('#')) {
                processedValue = hexToRgb(value);
            }
            setThemeForm(prev => ({
                ...prev,
                colors: { ...prev.colors, [field]: processedValue }
            }));
        }
    };

    const getCustomThemes = () => {
        return themes.filter(theme =>
            !['system', 'light', 'dark', 'rwmarkable-light', 'rwmarkable-dark', 'fccview', 'black-white', 'sunset', 'ocean', 'forest', 'nord', 'dracula', 'monokai', 'github-dark', 'tokyo-night', 'catppuccin', 'rose-pine', 'gruvbox', 'solarized-dark'].includes(theme.id)
        );
    };

    return {
        css,
        isLoadingCss,
        isSavingCss,
        hasCssChanges,
        handleCssChange,
        handleSaveCss,
        themes,
        isLoadingThemes,
        isSavingThemes,
        themeModalOpen,
        setThemeModalOpen,
        editingTheme,
        themeForm,
        handleCreateTheme,
        handleEditTheme,
        handleDeleteTheme,
        handleSaveTheme,
        handleThemeFormChange,
        getCustomThemes,
    };
};
