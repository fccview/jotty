"use client";

import { ComponentType } from "react";
import { File02Icon, Tv02Icon } from "hugeicons-react";
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
  icon: ComponentType<{ className?: string }>;
  labelKey: string;
  switchKey: string;
}

const modeOptions: ModeOption[] = [
  {
    mode: EditorModes.RICH,
    icon: Tv02Icon,
    labelKey: "editor.richEditor",
    switchKey: "editor.switchToRichEditor",
  },
  {
    mode: EditorModes.MARKDOWN,
    icon: File02Icon,
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
        "jotty-editor-mode-switch inline-flex flex-shrink-0 items-center gap-0.5 rounded-jotty border border-border bg-muted/60 p-0.5",
        className
      )}
    >
      {modeOptions.map(({ mode, icon: Icon, labelKey, switchKey }) => {
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
              "inline-flex items-center justify-center gap-1.5 rounded-jotty font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              compact ? "h-9 w-10" : "h-8 px-2.5 text-sm",
              isActive
                ? "bg-background text-foreground shadow-sm cursor-default"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={compact ? "h-5 w-5" : "h-4 w-4"} />
            {!compact && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
};
