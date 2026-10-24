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
  ArrowLeft01Icon,
  ArrowRight01Icon,
  MoreHorizontalIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { ToolbarDropdown } from "./ToolbarDropdown";
import { OverflowTool } from "./toolbarTools";
import { cn } from "@/app/_utils/global-utils";
import { useShortcuts } from "@/app/_hooks/useShortcuts";
import { MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from 'next-intl';
import { PromptModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/PromptModal";
import * as MarkdownUtils from "@/app/_utils/markdown-editor-utils";

interface ExtraItemsDropdownProps {
  editor: Editor;
  isMarkdownMode?: boolean;
  onMarkdownChange?: (content: string) => void;
  onFileModalOpen: () => void;
  onTableModalOpen: () => void;
  onImageSizeModalOpen: (url: string) => void;
  overflowTools?: OverflowTool[];
}

const menuRow =
  "w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent text-md lg:text-sm";

export const ExtraItemsDropdown = ({
  editor,
  isMarkdownMode = false,
  onMarkdownChange,
  onFileModalOpen,
  onTableModalOpen,
  onImageSizeModalOpen,
  overflowTools = [],
}: ExtraItemsDropdownProps) => {
  const t = useTranslations();
  const [isMac, setIsMac] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showAbbreviationModal, setShowAbbreviationModal] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const submenuTool = overflowTools.find((tool) => tool.key === openSubmenu);
  const hiddenCount = overflowTools.length;

  const resetSubmenu = useCallback((isOpen: boolean) => {
    if (!isOpen) setOpenSubmenu(null);
  }, []);

  const pickOverflowTool = (tool: OverflowTool, e: MouseEvent) => {
    if (!tool.menu) {
      tool.onSelect?.();
      return;
    }
    e.stopPropagation();
    setOpenSubmenu(tool.key);
  };

  useEffect(() => {
    setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform));
  }, []);

  const handleMarkdownInsert = (fn: (textarea: HTMLTextAreaElement) => string) =>
    MarkdownUtils.runMarkdownEdit(fn, onMarkdownChange);

  const addImage = () => {
    setShowImageModal(true);
  };

  const confirmAddImage = (url: string) => {
    if (url) onImageSizeModalOpen(url);
  };

  const toggleAbbreviation = () => {
    if (isMarkdownMode) {
      setShowAbbreviationModal(true);
    } else {
      const chain = editor.chain().focus();

      if (editor.isActive("abbreviation")) {
        chain.unsetMark("abbreviation").run();
        return;
      }

      setShowAbbreviationModal(true);
    }
  };

  const confirmAbbreviation = (title: string) => {
    if (title) {
      if (isMarkdownMode) {
        handleMarkdownInsert((textarea) => MarkdownUtils.insertAbbreviation(textarea, title));
      } else {
        editor.chain().focus().setMark("abbreviation", { title }).run();
      }
    }
  };

  const toggleDetails = () => {
    if (isMarkdownMode) {
      handleMarkdownInsert((textarea) => MarkdownUtils.insertDetails(textarea, "Details"));
    } else {
      const { from, to, empty } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, " ");

      editor
        .chain()
        .focus()
        .toggleWrap("details", { summary: !empty ? selectedText : undefined })
        .run();
    }
  };

  const items = useMemo(
    () => [
      {
        icon: <Image02Icon className="h-4 w-4" />,
        label: t("editor.image"),
        command: addImage,
        shortcut: { code: "KeyI", modKey: true, shiftKey: true },
      },
      {
        icon: <Attachment01Icon className="h-4 w-4" />,
        label: t("editor.file"),
        command: onFileModalOpen,
        shortcut: { code: "KeyF", modKey: true, shiftKey: true },
      },
      {
        icon: <LayoutTable01Icon className="h-4 w-4" />,
        label: t("editor.table"),
        command: onTableModalOpen,
        shortcut: { code: "KeyT", modKey: true, shiftKey: true },
      },
      {
        icon: <PenTool01Icon className="h-4 w-4" />,
        label: t("editor.highlight"),
        command: () => {
          if (isMarkdownMode) {
            handleMarkdownInsert(MarkdownUtils.insertHighlight);
          } else {
            editor.chain().focus().toggleHighlight().run();
          }
        },
        isActive: editor && editor.isActive("highlight"),
        shortcut: { code: "KeyH", modKey: true, shiftKey: true },
        textareaOwnsKey: true,
      },
      {
        icon: <TextSubscriptIcon className="h-4 w-4" />,
        label: "Subscript",
        command: () => {
          if (isMarkdownMode) {
            handleMarkdownInsert(MarkdownUtils.insertSubscript);
          } else {
            editor.chain().focus().toggleMark("subscript").run();
          }
        },
        isActive: editor && editor.isActive("subscript"),
        shortcut: { code: "Comma", modKey: true },
      },
      {
        icon: <TextSuperscriptIcon className="h-4 w-4" />,
        label: "Superscript",
        command: () => {
          if (isMarkdownMode) {
            handleMarkdownInsert(MarkdownUtils.insertSuperscript);
          } else {
            editor.chain().focus().toggleMark("superscript").run();
          }
        },
        isActive: editor && editor.isActive("superscript"),
        shortcut: { code: "Period", modKey: true },
      },
      {
        icon: <LetterSpacingIcon className="h-4 w-4" />,
        label: "Abbreviation",
        command: toggleAbbreviation,
        isActive: editor && editor.isActive("abbreviation"),
        shortcut: { code: "KeyA", modKey: true, shiftKey: true },
      },
      {
        icon: <SquareArrowDown02Icon className="h-4 w-4" />,
        label: t("editor.collapsible"),
        command: toggleDetails,
        isActive: editor && editor.isActive("details"),
        shortcut: { code: "KeyD", modKey: true, shiftKey: true },
      },
    ],
    [editor, isMarkdownMode, onMarkdownChange, onFileModalOpen, onTableModalOpen, t, toggleAbbreviation, toggleDetails]
  );

  const shortcuts = useMemo(
    () =>
      items
        .filter((item) => !(isMarkdownMode && item.textareaOwnsKey))
        .map((item) => ({
          ...item.shortcut,
          handler: item.command,
        })),
    [items, isMarkdownMode]
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
      className="relative flex items-center gap-1"
      title={hiddenCount ? t("editor.moreToolsCount", { count: hiddenCount }) : t("editor.moreTools")}
      aria-label={hiddenCount ? t("editor.moreToolsCount", { count: hiddenCount }) : t("editor.moreTools")}
    >
      <MoreHorizontalIcon className="h-4 w-4" />
      <ArrowDown01Icon className="h-3 w-3" />
      {hiddenCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-jotty bg-primary text-primary-foreground text-[10px] font-bold leading-4">
          {hiddenCount}
        </span>
      )}
    </Button>
  );

  return (
    <>
      <ToolbarDropdown trigger={trigger} direction="right" onOpenChange={resetSubmenu}>
        {submenuTool ? (
          <>
            <button
              className={cn(menuRow, "border-b border-border font-medium")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                setOpenSubmenu(null);
              }}
            >
              <ArrowLeft01Icon className="h-4 w-4" />
              <span>{submenuTool.label}</span>
            </button>
            <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">{submenuTool.menu}</div>
          </>
        ) : (
          <div className="flex flex-col py-1 overflow-y-auto">
            {overflowTools.map((tool) => (
              <button
                key={tool.key}
                className={cn(menuRow, tool.isActive && "bg-accent")}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => pickOverflowTool(tool, e)}
              >
                {tool.icon}
                <span className="flex-1">{tool.label}</span>
                {tool.menu && <ArrowRight01Icon className="h-3 w-3 text-muted-foreground" />}
              </button>
            ))}
            {hiddenCount > 0 && <div className="my-1 border-t border-border" />}
            {items.map((item, index) => (
              <button
                key={index}
                className={cn(menuRow, "justify-between gap-4", item.isActive && "bg-accent")}
                onClick={item.command}
              >
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.shortcut && (
                  <span className="text-md lg:text-xs text-muted-foreground">
                    {getShortcutDisplay(item.shortcut)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </ToolbarDropdown>

      <PromptModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onConfirm={confirmAddImage}
        title={t("editor.addImage")}
        message={t("editor.enterImageURL")}
        placeholder="https://example.com/image.jpg"
        confirmText={t("common.confirm")}
      />

      <PromptModal
        isOpen={showAbbreviationModal}
        onClose={() => setShowAbbreviationModal(false)}
        onConfirm={confirmAbbreviation}
        title="Abbreviation"
        message="Enter abbreviation title (e.g., HyperText Markup Language)"
        placeholder="HyperText Markup Language"
        confirmText={t("common.confirm")}
      />
    </>
  );
};
