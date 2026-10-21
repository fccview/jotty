"use client";

import { useEffect, useState } from "react";
import { resolveTheme } from "@/app/_utils/settings-store";
import { useQuickValue } from "@/app/_hooks/settings/useQuickSetting";
import { QuickSettingId, SYSTEM_THEME } from "@/app/_consts/quick-settings";
import { BUILT_IN_THEMES, getCustomThemeColors } from "@/app/_consts/themes";
import { useAppMode } from "./AppModeProvider";
import { useRadiusOverride } from "@/app/_hooks/useRadiusOverride";
import { useNoteFontSizeOverride } from "@/app/_hooks/useNoteFontSizeOverride";
import { useBodyCookieSync } from "@/app/_hooks/browse/useBodyCookieSync";
import { useTranslations } from "next-intl";
import { syncThemeColorMeta } from "@/app/_utils/theme-color-utils";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { isRwMarkable } = useAppMode();
  const t = useTranslations();
  const theme = useQuickValue(QuickSettingId.THEME);
  const [resolvedTheme, setResolvedTheme] = useState<string>(() =>
    resolveTheme(theme, isRwMarkable)
  );

  useRadiusOverride();
  useNoteFontSizeOverride();
  useBodyCookieSync();

  const themeIDs = BUILT_IN_THEMES.map((theme) => theme.id);

  const [customThemeColors, setCustomThemeColors] = useState<{
    [key: string]: any;
  }>({});

  const [customCSS, setCustomCSS] = useState<string>("");

  const loadCustomCSS = async () => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/custom-css?t=${timestamp}`);
      if (response.ok) {
        const css = await response.text();
        setCustomCSS(css);
      }
    } catch (error) {
      console.error("Failed to load custom CSS:", error);
    }
  };

  useEffect(() => {
    const loadCustomColors = async () => {
      try {
        const colors = await getCustomThemeColors();
        setCustomThemeColors(colors);
      } catch (error) {
        console.error("Failed to load custom theme colors:", error);
      }
    };

    loadCustomColors();
    loadCustomCSS();
  }, []);

  useEffect(() => {
    const handleCssUpdate = () => {
      loadCustomCSS();
    };

    window.addEventListener("css-updated", handleCssUpdate);

    return () => {
      window.removeEventListener("css-updated", handleCssUpdate);
    };
  }, [loadCustomCSS]);

  useEffect(() => {
    const updateResolvedTheme = () => {
      setResolvedTheme(resolveTheme(theme, isRwMarkable));
    };

    updateResolvedTheme();

    if (theme === SYSTEM_THEME && typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => updateResolvedTheme();

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme, isRwMarkable]);

  useEffect(() => {
    const allThemes = [...themeIDs, ...Object.keys(customThemeColors)];
    document.documentElement.classList.remove(...allThemes);
    document.documentElement.classList.add(resolvedTheme);

    if (customThemeColors[resolvedTheme]) {
      const styleId = "custom-theme-styles";
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;

      if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }

      const cssVariables = Object.entries(customThemeColors[resolvedTheme])
        .map(([key, value]) => `${key}: ${value};`)
        .join("\n        ");

      const cssContent = `
        .${resolvedTheme} {
          ${cssVariables}
        }
      `;

      styleElement.textContent = cssContent;

      Object.keys(customThemeColors[resolvedTheme]).forEach((key) => {
        document.documentElement.style.removeProperty(key);
      });

      const initStyleElement = document.getElementById(
        "custom-theme-init-styles"
      ) as HTMLStyleElement;
      if (initStyleElement) {
        initStyleElement.remove();
      }
    }

    if (customCSS) {
      const customStyleId = "custom-css-styles";
      let customStyleElement = document.getElementById(
        customStyleId
      ) as HTMLStyleElement;

      if (!customStyleElement) {
        customStyleElement = document.createElement("style");
        customStyleElement.id = customStyleId;
        document.head.appendChild(customStyleElement);
      }

      customStyleElement.textContent = customCSS;
    }

    syncThemeColorMeta();
  }, [resolvedTheme, customThemeColors, customCSS]);

  return <>{children}</>;
};
