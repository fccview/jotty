"use client";

import { Editor } from "@tiptap/react";
import { ArrowDown01Icon, SourceCodeIcon, Search01Icon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { codeblockLangs } from "@/app/_utils/code-block-utils";
import { useState, useMemo } from "react";
import { ToolbarDropdown } from "../Toolbar/ToolbarDropdown";
import { useTranslations } from "next-intl";
import { insertCodeBlock } from "@/app/_utils/markdown-editor-utils";

interface CodeBlockDropdownProps {
  editor: Editor | null;
  isMarkdownMode?: boolean;
  onMarkdownChange?: (content: string) => void;
}

export const CodeBlockDropdown = ({
  editor,
  isMarkdownMode = false,
  onMarkdownChange,
}: CodeBlockDropdownProps) => {
  const t = useTranslations();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLanguages = useMemo(() => {
    if (!searchTerm.trim()) {
      return codeblockLangs;
    }

    const searchLower = searchTerm.toLowerCase();
    return codeblockLangs.filter(
      (lang: any) =>
        lang.label.toLowerCase().includes(searchLower) ||
        lang.value.toLowerCase().includes(searchLower)
    );
  }, [searchTerm]);

  if (!editor) return null;

  const setCodeBlock = (language: string) => {
    if (isMarkdownMode && onMarkdownChange) {
      const textarea = document.getElementById(
        "markdown-editor-textarea"
      ) as HTMLTextAreaElement;
      if (textarea) {
        const newContent = insertCodeBlock(textarea, language);
        onMarkdownChange(newContent);
      }
    } else {
      editor.chain().focus().toggleCodeBlock({ language }).run();
    }
    setSearchTerm("");
  };

  const isCodeBlockActive = editor && editor.isActive("codeBlock");

  const trigger = (
    <Button
      variant={isCodeBlockActive ? "secondary" : "ghost"}
      size="sm"
      onMouseDown={(e) => e.preventDefault()}
      className="flex items-center gap-1"
      title={t("editor.code")}
    >
      <SourceCodeIcon className="h-4 w-4" />
      <ArrowDown01Icon className="h-3 w-3" />
    </Button>
  );

  return (
    <ToolbarDropdown trigger={trigger} direction="right">
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search01Icon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("editor.searchLanguages")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full pl-7 pr-2 py-1 text-sm lg:text-xs bg-input border border-border rounded-jotty focus:outline-none focus:ring-none focus:ring-ring"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[300px]">
        {filteredLanguages.length > 0 ? (
          filteredLanguages.map((lang) => (
            <button
              key={lang.value}
              className="w-full flex items-center gap-2 px-3 py-1 text-left hover:bg-accent text-sm"
              onClick={() => setCodeBlock(lang.value)}
            >
              <span
                className={`${lang.value} language-icon rounded inline-block`}
              >
                {lang.icon}
              </span>
              <span>{lang.label}</span>
            </button>
          ))
        ) : (
          <div className="px-3 py-4 text-md lg:text-sm text-muted-foreground text-center">
            {t("editor.noLanguagesFound")}
          </div>
        )}
      </div>
    </ToolbarDropdown>
  );
};
