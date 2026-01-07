"use client";

import { useState } from "react";
import { Sun03Icon, GibbousMoonIcon } from "hugeicons-react";
import { useTranslations } from "next-intl";

interface DrawioRendererProps {
  svgData: string;
  themeMode?: string;
  className?: string;
}

export const DrawioRenderer = ({
  svgData,
  themeMode: initialTheme = "light",
  className = "",
}: DrawioRendererProps) => {
  const [themeMode, setThemeMode] = useState(initialTheme);
  const t = useTranslations();

  if (!svgData) {
    return (
      <div
        className={`border border-border rounded p-4 my-4 text-center text-muted-foreground ${className}`}
      >
        <p>{t("notes.drawioNoPreview")}</p>
      </div>
    );
  }

  const toggleTheme = () => {
    setThemeMode(themeMode === "light" ? "dark" : "light");
  };

  return (
    <div
      className={`relative group border border-border rounded-jotty p-4 my-4 bg-background ${className}`}
    >
      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 z-10">
        <button
          onClick={toggleTheme}
          className="px-2 py-1 bg-muted text-foreground rounded text-sm lg:text-xs hover:bg-muted/80"
          title={`Switch to ${themeMode === "light" ? "dark" : "light"} mode`}
        >
          {themeMode === "light" ? (
            <GibbousMoonIcon className="h-3 w-3" />
          ) : (
            <Sun03Icon className="h-3 w-3" />
          )}
        </button>
      </div>
      <div
        className="flex justify-center items-center"
        style={{
          filter:
            themeMode === "dark"
              ? "invert(0.92) contrast(0.85) brightness(1.1) saturate(1.2)"
              : "none",
        }}
        dangerouslySetInnerHTML={{ __html: svgData }}
      />
    </div>
  );
};
