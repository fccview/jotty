"use client";

import { Editor } from "@tiptap/react";
import { ChevronDown, Code, Search } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { popularCodeBlockLanguages } from "@/app/_utils/code-block-utils";
import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

interface CodeBlockDropdownProps {
  editor: Editor | null;
}

export const CodeBlockDropdown = ({ editor }: CodeBlockDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalContainerRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const portalContainer = document.createElement("div");
    portalContainer.style.position = "fixed";
    portalContainer.style.zIndex = "9999";
    portalContainer.style.pointerEvents = "none";
    document.body.appendChild(portalContainer);
    portalContainerRef.current = portalContainer;

    return () => {
      if (
        portalContainerRef.current &&
        document.body.contains(portalContainerRef.current)
      ) {
        document.body.removeChild(portalContainerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        portalContainerRef.current &&
        !portalContainerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!editor) return null;

  const setCodeBlock = (language: string) => {
    editor.chain().focus().toggleCodeBlock({ language }).run();
    setIsOpen(false);
    setSearchTerm("");
  };

  const isCodeBlockActive = editor.isActive("codeBlock");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const dropdownContent = (
    <>
      {isOpen && (
        <div
          className="fixed bg-background border border-border rounded-md shadow-lg min-w-[250px] max-h-[400px] overflow-hidden flex flex-col"
          style={{
            top: `${dropdownRef.current?.getBoundingClientRect().bottom || 0
              }px`,
            left: `${dropdownRef.current?.getBoundingClientRect().left || 0}px`,
            pointerEvents: "auto",
          }}
        >
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search languages..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-7 pr-2 py-1 text-xs bg-input border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-ring"
                onClick={(e) => e.stopPropagation()}
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
        </div>
      )}
    </>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant={isCodeBlockActive ? "secondary" : "ghost"}
        size="sm"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1"
      >
        <Code className="h-4 w-4" />
        <span className="text-xs">Code</span>
        <ChevronDown className="h-3 w-3" />
      </Button>

      {portalContainerRef.current &&
        createPortal(dropdownContent, portalContainerRef.current)}
    </div>
  );
};
