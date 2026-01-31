"use client";

import {
  Settings02Icon,
  ArrowDown01Icon,
  Tick02Icon,
  ViewIcon,
  LeftToRightListNumberIcon,
  RulerIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { ToolbarDropdown } from "./ToolbarDropdown";
import { useNotesStore } from "@/app/_utils/notes-store";
import { useTranslations } from "next-intl";

interface EditorSettingsDropdownProps {
  isMarkdownMode: boolean;
  showPreview?: boolean;
  onTogglePreview?: () => void;
}

export const EditorSettingsDropdown = ({
  isMarkdownMode,
  showPreview,
  onTogglePreview,
}: EditorSettingsDropdownProps) => {
  const t = useTranslations();
  const {
    showLineNumbers,
    setShowLineNumbers,
    showRuler,
    setShowRuler,
  } = useNotesStore();

  if (!isMarkdownMode) return null;

  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      onMouseDown={(e) => e.preventDefault()}
      className="flex items-center gap-1"
      title={t("common.settings")}
    >
      <Settings02Icon className="h-4 w-4" />
      <ArrowDown01Icon className="h-3 w-3" />
    </Button>
  );

  return (
    <ToolbarDropdown trigger={trigger} direction="right">
      <div className="flex flex-col py-1 overflow-y-auto">
        {onTogglePreview && (
          <button
            className={`w-full flex items-center justify-between gap-4 px-3 py-2 text-left hover:bg-accent text-md lg:text-sm ${showPreview ? "bg-accent" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePreview();
            }}
          >
            <div className="flex items-center gap-2">
              <ViewIcon className="h-4 w-4" />
              <span>{t("editor.preview")}</span>
            </div>
            {showPreview && <Tick02Icon className="h-4 w-4 text-primary" />}
          </button>
        )}
        <button
          className={`w-full flex items-center justify-between gap-4 px-3 py-2 text-left hover:bg-accent text-md lg:text-sm ${showLineNumbers ? "bg-accent" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowLineNumbers(!showLineNumbers);
          }}
        >
          <div className="flex items-center gap-2">
            <LeftToRightListNumberIcon className="h-4 w-4" />
            <span>{t("editor.lineNumbers")}</span>
          </div>
          {showLineNumbers && <Tick02Icon className="h-4 w-4 text-primary" />}
        </button>
        <button
          className={`w-full flex items-center justify-between gap-4 px-3 py-2 text-left hover:bg-accent text-md lg:text-sm ${showRuler ? "bg-accent" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowRuler(!showRuler);
          }}
        >
          <div className="flex items-center gap-2">
            <RulerIcon className="h-4 w-4" />
            <span>{t("editor.ruler")}</span>
          </div>
          {showRuler && <Tick02Icon className="h-4 w-4 text-primary" />}
        </button>
      </div>
    </ToolbarDropdown>
  );
};
