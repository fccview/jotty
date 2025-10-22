"use client";

import { Editor } from "@tiptap/react";
import { ChevronDown, Code, Search } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { popularCodeBlockLanguages } from "@/app/_utils/code-block-utils";
import { useState, useMemo } from "react";
import { ToolbarDropdown } from "../Toolbar/ToolbarDropdown";

interface CodeBlockDropdownProps {
  editor: Editor | null;
}

export const CodeBlockDropdown = ({ editor }: CodeBlockDropdownProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLanguages = useMemo(() => {
    if (!searchTerm.trim()) {
      return popularCodeBlockLanguages;
    }

    const searchLower = searchTerm.toLowerCase();
    return popularCodeBlockLanguages.filter(
      (lang: any) =>
        lang.label.toLowerCase().includes(searchLower) ||
        lang.value.toLowerCase().includes(searchLower)
    );
  }, [searchTerm]);

  if (!editor) return null;

  const setCodeBlock = (language: string) => {
    editor.chain().focus().toggleCodeBlock({ language }).run();
    setSearchTerm("");
  };

  const isCodeBlockActive = editor.isActive("codeBlock");

  const trigger = (
    <Button
      variant={isCodeBlockActive ? "secondary" : "ghost"}
      size="sm"
      onMouseDown={(e) => e.preventDefault()}
      className="flex items-center gap-1"
    >
      <Code className="h-4 w-4" />
      <span className="text-xs">Code</span>
      <ChevronDown className="h-3 w-3" />
    </Button>
  );

  return (
    <ToolbarDropdown trigger={trigger}>
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search languages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full pl-7 pr-2 py-1 text-xs bg-input border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[300px]">
        {filteredLanguages.length > 0 ? (
          filteredLanguages.map((lang) => (
            <button
              key={lang.value}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent text-sm"
              onClick={() => setCodeBlock(lang.value)}
            >
              {lang.icon}
              <span>{lang.label}</span>
            </button>
          ))
        ) : (
          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
            No languages found
          </div>
        )}
      </div>
    </ToolbarDropdown>
  );
};
