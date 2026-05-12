"use client";

import { Editor } from "@tiptap/react";
import {
  ArrowDown01Icon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  TextIndentMoreIcon,
  TextIndentLessIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { ToolbarDropdown } from "./ToolbarDropdown";
import { useTranslations } from "next-intl";
import * as MarkdownUtils from "@/app/_utils/markdown-editor-utils";

interface ListMenuDropdownProps {
  editor: Editor | null;
  isMarkdownMode: boolean;
  onMarkdownChange?: (content: string) => void;
  listState: {
    isInList: boolean;
    isNested: boolean;
    isInBulletList: boolean;
    isInOrderedList: boolean;
    currentItemIsEmpty: boolean;
  };
}

export const ListMenuDropdown = ({
  editor,
  isMarkdownMode,
  onMarkdownChange,
  listState,
}: ListMenuDropdownProps) => {
  const t = useTranslations();

  if (!editor) return null;

  const applyMarkdown = (fn: (ta: HTMLTextAreaElement) => string) => {
    const textarea = document.getElementById(
      "markdown-editor-textarea"
    ) as HTMLTextAreaElement;
    if (textarea && onMarkdownChange) {
      const scrollTop = textarea.scrollTop;
      const scrollLeft = textarea.scrollLeft;
      const newContent = fn(textarea);
      const selectionStart = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;
      onMarkdownChange(newContent);
      requestAnimationFrame(() => {
        const ta = document.getElementById(
          "markdown-editor-textarea"
        ) as HTMLTextAreaElement;
        if (ta) {
          ta.focus({ preventScroll: true });
          ta.setSelectionRange(selectionStart, selectionEnd);
          ta.scrollTop = scrollTop;
          ta.scrollLeft = scrollLeft;
        }
      });
    }
  };

  const handleBulletList = () => {
    if (isMarkdownMode) {
      applyMarkdown(MarkdownUtils.insertBulletList);
      return;
    }
    if (listState.isInBulletList && listState.currentItemIsEmpty) {
      editor.chain().focus().liftListItem("listItem").run();
    } else {
      editor.chain().focus().toggleBulletList().run();
    }
  };

  const handleOrderedList = () => {
    if (isMarkdownMode) {
      applyMarkdown(MarkdownUtils.insertOrderedList);
      return;
    }
    if (listState.isInOrderedList && listState.currentItemIsEmpty) {
      editor.chain().focus().liftListItem("listItem").run();
    } else {
      editor.chain().focus().toggleOrderedList().run();
    }
  };

  const handleIndent = () => {
    if (isMarkdownMode) {
      applyMarkdown(MarkdownUtils.indentLines);
      return;
    }
    editor.chain().focus().sinkListItem("listItem").run();
  };

  const handleOutdent = () => {
    if (isMarkdownMode) {
      applyMarkdown(MarkdownUtils.outdentLines);
      return;
    }
    editor.chain().focus().liftListItem("listItem").run();
  };

  const isActive = listState.isInList;

  const trigger = (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      size="sm"
      onMouseDown={(e) => e.preventDefault()}
      className="flex items-center gap-1"
      title={t("editor.listOptions")}
    >
      <LeftToRightListBulletIcon className="h-4 w-4" />
      <ArrowDown01Icon className="h-3 w-3" />
    </Button>
  );

  return (
    <ToolbarDropdown trigger={trigger}>
      <div className="py-1">
        <button
          className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-accent text-sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleBulletList}
        >
          <LeftToRightListBulletIcon className="h-4 w-4 shrink-0" />
          <span>{t("editor.toggleBulletList")}</span>
        </button>
        <button
          className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-accent text-sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleOrderedList}
        >
          <LeftToRightListNumberIcon className="h-4 w-4 shrink-0" />
          <span>{t("editor.toggleOrderedList")}</span>
        </button>
        <div className="my-1 border-t border-border" />
        <button
          className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-accent text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleIndent}
          disabled={!isMarkdownMode && !listState.isInList}
        >
          <TextIndentMoreIcon className="h-4 w-4 shrink-0" />
          <span>{t("editor.indentListItem")}</span>
        </button>
        <button
          className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-accent text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleOutdent}
          disabled={!isMarkdownMode && (!listState.isInList || !listState.isNested)}
        >
          <TextIndentLessIcon className="h-4 w-4 shrink-0" />
          <span>{t("editor.outdentListItem")}</span>
        </button>
      </div>
    </ToolbarDropdown>
  );
};
