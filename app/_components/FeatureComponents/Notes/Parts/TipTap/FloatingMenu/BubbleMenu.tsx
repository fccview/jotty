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

interface BubbleMenuProps {
  editor: Editor;
  isVisible: boolean;
  onClose: () => void;
}

export const BubbleMenu = ({ editor, isVisible, onClose }: BubbleMenuProps) => {
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState({
    x: 0,
    y: 0,
  });
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !menuRef.current) return;

    const updatePosition = () => {
      if (menuRef.current) {
        const { from, to } = editor.state.selection;
        if (from === to) return;

        const coords = editor.view.coordsAtPos(from);
        const menuRect = menuRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        let top = coords.top - menuRect.height - 8;
        let left = coords.left;

        if (top < 0) {
          top = coords.bottom + 8;
        }

        if (left + menuRect.width > viewportWidth) {
          left = viewportWidth - menuRect.width - 8;
        }

        if (left < 0) {
          left = 8;
        }

        menuRef.current.style.left = `${left}px`;
        menuRef.current.style.top = `${top}px`;

        setColorPickerPosition({
          x: left,
          y: top - 10,
        });
        setTargetElement(menuRef.current);
      }
    };

    updatePosition();

    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isVisible, editor]);

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) return;
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

  if (!isVisible) return null;

  return (
    <>
      <div
        ref={menuRef}
        data-overlay
        className="fixed z-40 bg-card border border-border rounded-lg shadow-lg p-1 flex items-center gap-1"
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
    </>
  );
};
