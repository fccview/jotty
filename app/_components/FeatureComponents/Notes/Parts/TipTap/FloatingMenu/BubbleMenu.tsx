"use client";

import { Editor } from "@tiptap/react";
import {
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  TextStrikethroughIcon,
  SourceCodeIcon,
  Attachment01Icon,
  PaintBrush04Icon,
  PenTool01Icon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { ColorPicker } from "../ColorPicker/ColorPicker";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MenuBox, menuBounds } from "@/app/_utils/menu-placement-utils";
import { PromptModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/PromptModal";
import { useTranslations } from "next-intl";

const MENU_GAP = 8;
const MOBILE_MENU_GAP = 20;
const VIEWPORT_MARGIN = 8;
const MOBILE_BREAKPOINT = 768;
const MOBILE_AGENT = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

const selectionBounds = (editor: Editor, pos: number): MenuBox => {
  const { node } = editor.view.domAtPos(pos);
  const element = node instanceof HTMLElement ? node : node.parentElement;
  if (element) return menuBounds(element);
  return { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight };
};

interface BubbleMenuProps {
  editor: Editor;
  isVisible: boolean;
  onClose: () => void;
}

export const BubbleMenu = ({ editor, isVisible, onClose }: BubbleMenuProps) => {
  const t = useTranslations();
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [previousUrl, setPreviousUrl] = useState("");
  const [colorPickerPosition, setColorPickerPosition] = useState({
    x: 0,
    y: 0,
  });
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !menuRef.current) return;

    const updatePosition = () => {
      const menu = menuRef.current;
      if (!menu) return;
      const { from, to, empty } = editor.state.selection;
      if (empty) return;

      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      const { width, height } = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const bounds = selectionBounds(editor, from);
      const isMobile =
        MOBILE_AGENT.test(navigator.userAgent) ||
        viewportWidth < MOBILE_BREAKPOINT;

      const above = Math.min(start.top, end.top) - height - MENU_GAP;
      const below =
        Math.max(start.bottom, end.bottom) +
        (isMobile ? MOBILE_MENU_GAP : MENU_GAP);
      const fitsAbove = above >= bounds.top + VIEWPORT_MARGIN;
      const fitsBelow = below + height <= bounds.bottom - VIEWPORT_MARGIN;
      const placeBelow = isMobile
        ? fitsBelow || !fitsAbove
        : !fitsAbove && fitsBelow;

      const top = placeBelow ? below : above;
      const anchorLeft = isMobile ? end.left : start.left;
      const left = Math.max(
        VIEWPORT_MARGIN,
        Math.min(anchorLeft, viewportWidth - width - VIEWPORT_MARGIN),
      );

      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;

      setColorPickerPosition({
        x: left,
        y: top - 10,
      });
      setTargetElement(menu);
    };

    updatePosition();

    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    editor.on("selectionUpdate", updatePosition);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      editor.off("selectionUpdate", updatePosition);
    };
  }, [isVisible, editor]);

  const setLink = () => {
    const currentUrl = editor.getAttributes("link").href;
    setPreviousUrl(currentUrl || "");
    setShowLinkModal(true);
  };

  const confirmSetLink = (url: string) => {
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  };

  const handleTextColorSelect = (color: string) => {
    if (color) {
      editor.chain().focus().setColor(color).run();
    } else {
      editor.chain().focus().unsetColor().run();
    }
    setShowTextColorPicker(false);
  };

  const handleHighlightSelect = (color: string) => {
    if (color) {
      editor.chain().focus().setHighlight({ color }).run();
    } else {
      editor.chain().focus().unsetHighlight().run();
    }
    setShowHighlightPicker(false);
  };

  const getCurrentTextColor = () => {
    return editor.getAttributes("textStyle").color || "";
  };

  const getCurrentHighlightColor = () => {
    return editor.getAttributes("highlight").color || "";
  };

  if (!isVisible || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        ref={menuRef}
        data-overlay
        className="fixed z-40 bg-card border border-border rounded-jotty shadow-lg p-1 flex items-center gap-1"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant={editor.isActive("bold") ? "secondary" : "ghost"}
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <TextBoldIcon className="h-4 w-4" />
        </Button>

        <Button
          variant={editor.isActive("italic") ? "secondary" : "ghost"}
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <TextItalicIcon className="h-4 w-4" />
        </Button>

        <Button
          variant={editor.isActive("underline") ? "secondary" : "ghost"}
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <TextUnderlineIcon className="h-4 w-4" />
        </Button>

        <Button
          variant={editor.isActive("strike") ? "secondary" : "ghost"}
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <TextStrikethroughIcon className="h-4 w-4" />
        </Button>

        <Button
          variant={editor.isActive("code") ? "secondary" : "ghost"}
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <SourceCodeIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant={editor.isActive("link") ? "secondary" : "ghost"}
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={setLink}
        >
          <Attachment01Icon className="h-4 w-4" />
        </Button>

        <Button
          variant={editor.isActive("textStyle") ? "secondary" : "ghost"}
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowTextColorPicker(!showTextColorPicker)}
        >
          <PaintBrush04Icon className="h-4 w-4" />
        </Button>

        <Button
          variant={editor.isActive("highlight") ? "secondary" : "ghost"}
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowHighlightPicker(!showHighlightPicker)}
        >
          <PenTool01Icon className="h-4 w-4" />
        </Button>
      </div>

      <ColorPicker
        isVisible={showTextColorPicker}
        onClose={() => setShowTextColorPicker(false)}
        onColorSelect={handleTextColorSelect}
        currentColor={getCurrentTextColor()}
        type="text"
        position={colorPickerPosition}
        targetElement={targetElement || undefined}
      />

      <ColorPicker
        isVisible={showHighlightPicker}
        onClose={() => setShowHighlightPicker(false)}
        onColorSelect={handleHighlightSelect}
        currentColor={getCurrentHighlightColor()}
        type="highlight"
        position={colorPickerPosition}
        targetElement={targetElement || undefined}
      />

      <PromptModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onConfirm={confirmSetLink}
        title={t("editor.addLink")}
        message={t("editor.enterURL")}
        placeholder="https://example.com"
        defaultValue={previousUrl}
        confirmText={t("common.confirm")}
      />
    </>,
    document.body,
  );
};
