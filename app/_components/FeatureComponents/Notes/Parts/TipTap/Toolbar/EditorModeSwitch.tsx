"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/app/_utils/global-utils";

export enum EditorModes {
  RICH = "rich",
  MARKDOWN = "markdown",
}

interface EditorModeSwitchProps {
  isMarkdownMode: boolean;
  onToggle: () => void;
  shortcut: string;
  compact?: boolean;
  className?: string;
}

interface ModeOption {
  mode: EditorModes;
  glyph: string;
  glyphClassName: string;
  labelKey: string;
  switchKey: string;
}

const modeOptions: ModeOption[] = [
  {
    mode: EditorModes.RICH,
    glyph: "Aa",
    glyphClassName: "font-serif italic",
    labelKey: "editor.richEditor",
    switchKey: "editor.switchToRichEditor",
  },
  {
    mode: EditorModes.MARKDOWN,
    glyph: "#",
    glyphClassName: "font-mono font-bold",
    labelKey: "editor.markdown",
    switchKey: "editor.switchToMarkdown",
  },
];

export const EditorModeSwitch = ({
  isMarkdownMode,
  onToggle,
  shortcut,
  compact = false,
  className,
}: EditorModeSwitchProps) => {
  const t = useTranslations();
  const current = isMarkdownMode ? EditorModes.MARKDOWN : EditorModes.RICH;

  return (
    <div
      role="radiogroup"
      aria-label={t("editor.editorMode")}
      className={cn(
        "jotty-editor-mode-switch relative inline-grid flex-shrink-0 grid-cols-2 items-center gap-0.5 rounded-jotty border border-border bg-muted/60 p-0.5",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0.5 left-0.5 w-[calc(50%-0.1875rem)] rounded-jotty bg-primary shadow-sm",
          "transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
          isMarkdownMode && "translate-x-[calc(100%+0.125rem)]"
        )}
      />
      {modeOptions.map(({ mode, glyph, glyphClassName, labelKey, switchKey }) => {
        const isActive = mode === current;
        const label = t(labelKey);
        const hint = isActive
          ? t("editor.currentEditorMode", { mode: label })
          : `${t(switchKey)} (${shortcut})`;

        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            title={hint}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => !isActive && onToggle()}
            className={cn(
              "relative z-10 inline-flex items-center justify-center rounded-jotty text-sm transition-colors duration-200",
              glyphClassName,
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              compact ? "h-8 w-9" : "h-7 w-8",
              isActive
                ? "text-primary-foreground cursor-default"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span aria-hidden="true">{glyph}</span>
          </button>
        );
      })}
    </div>
  );
};
