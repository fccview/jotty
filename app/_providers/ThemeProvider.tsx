"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/app/_utils/settings-store";
import { BUILT_IN_THEMES, getCustomThemeColors } from "@/app/_consts/themes";
import { useAppMode } from "./AppModeProvider";
import { User } from "../_types";
import { useTranslations } from "next-intl";

export const ThemeProvider = ({
  children,
  user,
}: {
  children: React.ReactNode;
  user: Partial<User>;
}) => {
  const { isRwMarkable } = useAppMode();
  const t = useTranslations();
  const { theme: localStorageTheme, getResolvedTheme } = useSettings();
  const [resolvedTheme, setResolvedTheme] = useState<string>(() =>
    getResolvedTheme(isRwMarkable, user.preferredTheme)
  );

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
      const resolved = getResolvedTheme(isRwMarkable, user.preferredTheme);
      setResolvedTheme(resolved);
    };

    updateResolvedTheme();

    if (
      (localStorageTheme === "system" || user.preferredTheme === "system") &&
      typeof window !== "undefined"
    ) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => updateResolvedTheme();

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [localStorageTheme, user.preferredTheme, getResolvedTheme]);

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
  }, [resolvedTheme, customThemeColors, customCSS]);

  return <>{children}</>;
};
