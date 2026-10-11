"use client";

import type { ReactNode } from "react";
import { GibbousMoonIcon, Sun03Icon } from "hugeicons-react";
import { useTranslations } from "next-intl";
import { SvgFrame } from "@/app/_components/FeatureComponents/Notes/Parts/SvgFrame";
import { DIAGRAM_DARK_FILTER } from "@/app/_consts/diagrams";
import { DiagramTheme } from "@/app/_utils/markdown/diagram-comment";

interface DiagramFrameProps {
  svg: string | null | undefined;
  alt: string;
  themeMode: DiagramTheme;
  onToggleTheme: () => void;
  placeholder: ReactNode;
  actions?: ReactNode;
  className?: string;
}

interface DiagramToolButtonProps {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: ReactNode;
}

const TOOLBAR =
  "absolute top-2 right-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100";

export const DiagramToolbar = ({ children }: { children: ReactNode }) => (
  <div className={TOOLBAR}>{children}</div>
);

export const DiagramToolButton = ({ label, onClick, destructive = false, children }: DiagramToolButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    className={`px-2 py-1 rounded text-sm lg:text-xs ${
      destructive
        ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
        : "bg-muted text-foreground hover:bg-muted/80"
    }`}
  >
    {children}
  </button>
);

export const DiagramFrame = ({
  svg,
  alt,
  themeMode,
  onToggleTheme,
  placeholder,
  actions,
  className = "",
}: DiagramFrameProps) => {
  const t = useTranslations();
  const isDark = themeMode === DiagramTheme.Dark;

  return (
    <div className={`diagram-frame relative group border border-border rounded-jotty p-4 my-4 bg-background ${className}`}>
      {(svg || actions) && (
        <DiagramToolbar>
          {svg && (
            <DiagramToolButton
              label={t(isDark ? "editor.diagramLightMode" : "editor.diagramDarkMode")}
              onClick={onToggleTheme}
            >
              {isDark ? <Sun03Icon className="h-3 w-3" /> : <GibbousMoonIcon className="h-3 w-3" />}
            </DiagramToolButton>
          )}
          {actions}
        </DiagramToolbar>
      )}
      {svg ? (
        <div className="flex justify-center" style={{ filter: isDark ? DIAGRAM_DARK_FILTER : undefined }}>
          <SvgFrame svg={svg} alt={alt} />
        </div>
      ) : (
        placeholder
      )}
    </div>
  );
};
