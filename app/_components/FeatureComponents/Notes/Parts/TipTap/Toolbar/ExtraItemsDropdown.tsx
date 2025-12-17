"use client";

import { Editor } from "@tiptap/react";
import {
  Image02Icon,
  Attachment01Icon,
  LayoutTable01Icon,
  PenTool01Icon,
  TextSubscriptIcon,
  TextSuperscriptIcon,
  LetterSpacingIcon,
  SquareArrowDown02Icon,
  ArrowDown01Icon,
  MoreHorizontalIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { ToolbarDropdown } from "./ToolbarDropdown";
import { useShortcuts } from "@/app/_hooks/useShortcuts";
import { useEffect, useMemo, useState } from "react";

interface ExtraItemsDropdownProps {
  editor: Editor;
  onFileModalOpen: () => void;
  onTableModalOpen: () => void;
  onImageSizeModalOpen: (url: string) => void;
}

export const ExtraItemsDropdown = ({
  editor,
  onFileModalOpen,
  onTableModalOpen,
  onImageSizeModalOpen,
}: ExtraItemsDropdownProps) => {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform));
  }, []);

  const addImage = () => {
    const url = window.prompt("Image URL");
    if (url) onImageSizeModalOpen(url);
  };

  const toggleAbbreviation = () => {
    const chain = editor.chain().focus();

    if (editor.isActive("abbreviation")) {
      chain.unsetMark("abbreviation").run();
      return;
    }

    const title = window.prompt(
      "Enter abbreviation title (e.g., HyperText Markup Language)"
    );
    if (title) {
      chain.setMark("abbreviation", { title }).run();
    }
  };

  const toggleDetails = () => {
    const { from, to, empty } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");

    editor
      .chain()
      .focus()
      .toggleWrap("details", { summary: !empty ? selectedText : undefined })
      .run();
  };

  const items = useMemo(
    () => [
      {
        icon: <Image02Icon className="h-4 w-4" />,
        label: "Image",
        command: addImage,
        shortcut: { code: "KeyI", modKey: true, shiftKey: true },
      },
      {
        icon: <Attachment01Icon className="h-4 w-4" />,
        label: "File",
        command: onFileModalOpen,
        shortcut: { code: "KeyF", modKey: true, shiftKey: true },
      },
      {
        icon: <LayoutTable01Icon className="h-4 w-4" />,
        label: "Table",
        command: onTableModalOpen,
        shortcut: { code: "KeyT", modKey: true, shiftKey: true },
      },
      {
        icon: <PenTool01Icon className="h-4 w-4" />,
        label: "Highlight",
        command: () => editor.chain().focus().toggleMark("mark").run(),
        isActive: editor.isActive("mark"),
        shortcut: { code: "KeyH", modKey: true, shiftKey: true },
      },
      {
        icon: <TextSubscriptIcon className="h-4 w-4" />,
        label: "Subscript",
        command: () => editor.chain().focus().toggleMark("subscript").run(),
        isActive: editor.isActive("subscript"),
        shortcut: { code: "Comma", modKey: true },
      },
      {
        icon: <TextSuperscriptIcon className="h-4 w-4" />,
        label: "Superscript",
        command: () => editor.chain().focus().toggleMark("superscript").run(),
        isActive: editor.isActive("superscript"),
        shortcut: { code: "Period", modKey: true },
      },
      {
        icon: <LetterSpacingIcon className="h-4 w-4" />,
        label: "Abbreviation",
        command: toggleAbbreviation,
        isActive: editor.isActive("abbreviation"),
        shortcut: { code: "KeyA", modKey: true, shiftKey: true },
      },
      {
        icon: <SquareArrowDown02Icon className="h-4 w-4" />,
        label: "Collapsible",
        command: toggleDetails,
        isActive: editor.isActive("details"),
        shortcut: { code: "KeyD", modKey: true, shiftKey: true },
      },
    ],
    [editor, onFileModalOpen, onTableModalOpen]
  );

  const shortcuts = useMemo(
    () =>
      items.map((item) => ({
        ...item.shortcut,
        handler: item.command,
      })),
    [items]
  );

  useShortcuts(shortcuts);

  const getShortcutDisplay = (shortcut: {
    code: string;
    modKey?: boolean;
    shiftKey?: boolean;
  }) => {
    if (!shortcut) return null;
    const mod = isMac ? "⌘" : "Ctrl";
    const shift = shortcut.shiftKey ? "⇧" : "";
    let key = shortcut.code.replace("Key", "");
    if (shortcut.code === "Comma") key = ",";
    if (shortcut.code === "Period") key = ".";
    return `${shift}${mod}${key}`;
  };

  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      onMouseDown={(e) => e.preventDefault()}
      className="flex items-center gap-1"
    >
      <MoreHorizontalIcon className="h-4 w-4" />
      <ArrowDown01Icon className="h-3 w-3" />
    </Button>
  );

  return (
    <ToolbarDropdown trigger={trigger} direction="right">
      <div className="flex flex-col py-1">
        {items.map((item, index) => (
          <button
            key={index}
            className={`w-full flex items-center justify-between gap-4 px-3 py-2 text-left hover:bg-accent text-sm ${
              item.isActive ? "bg-accent" : ""
            }`}
            onClick={item.command}
          >
            <div className="flex items-center gap-2">
              {item.icon}
              <span>{item.label}</span>
            </div>
            {item.shortcut && (
              <span className="text-xs text-muted-foreground">
                {getShortcutDisplay(item.shortcut)}
              </span>
            )}
          </button>
        ))}
      </div>
    </ToolbarDropdown>
  );
};
