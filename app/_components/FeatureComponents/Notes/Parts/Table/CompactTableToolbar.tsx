"use client";

import { Editor } from "@tiptap/react";
import {
  Delete03Icon,
  ArrowUp04Icon,
  ArrowDown04Icon,
  ArrowLeft04Icon,
  ArrowRight04Icon,
  MultiplicationSignIcon,
  MinusSignIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

interface CompactTableToolbarProps {
  editor: Editor;
  isVisible: boolean;
  position: { x: number; y: number };
  targetElement?: HTMLElement;
}

export const CompactTableToolbar = ({
  editor,
  isVisible,
  position,
  targetElement,
}: CompactTableToolbarProps) => {
  const t = useTranslations();
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !targetElement) return;

    const updatePosition = () => {
      if (targetElement && toolbarRef.current) {
        const rect = targetElement.getBoundingClientRect();
        toolbarRef.current.style.left = `${rect.left}px`;
        toolbarRef.current.style.top = `${rect.top - 35}px`;
      }
    };

    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isVisible, targetElement]);

  if (!isVisible) {
    return null;
  }

  const handleCommand = (command: () => boolean) => {
    editor.commands.focus();
    const result = command();
    if (!result) {
      console.error("Table command failed");
    }
  };

  const tableItems = [
    {
      icon: <ArrowUp04Icon className="h-3 w-3" />,
      label: "Add Row Above",
      command: () =>
        handleCommand(() => editor.chain().focus().addRowBefore().run()),
    },
    {
      icon: <ArrowDown04Icon className="h-3 w-3" />,
      label: "Add Row Below",
      command: () =>
        handleCommand(() => editor.chain().focus().addRowAfter().run()),
    },
    {
      icon: <ArrowLeft04Icon className="h-3 w-3" />,
      label: "Add Column Left",
      command: () =>
        handleCommand(() => editor.chain().focus().addColumnBefore().run()),
    },
    {
      icon: <ArrowRight04Icon className="h-3 w-3" />,
      label: "Add Column Right",
      command: () =>
        handleCommand(() => editor.chain().focus().addColumnAfter().run()),
    },
    {
      icon: <MinusSignIcon className="h-3 w-3" />,
      label: "Delete Row",
      command: () =>
        handleCommand(() => editor.chain().focus().deleteRow().run()),
      destructive: true,
    },
    {
      icon: <MultiplicationSignIcon className="h-3 w-3" />,
      label: "Delete Column",
      command: () =>
        handleCommand(() => editor.chain().focus().deleteColumn().run()),
      destructive: true,
    },
    {
      icon: <Delete03Icon className="h-3 w-3" />,
      label: "Delete Table",
      command: () =>
        handleCommand(() => editor.chain().focus().deleteTable().run()),
      destructive: true,
    },
  ];

  return (
    <div
      ref={toolbarRef}
      data-overlay
      className="fixed z-[5] bg-card border border-border rounded-jotty shadow-lg p-1"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 25}px`,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded text-xs text-muted-foreground">
          <span>{t('editor.table')}</span>
        </div>

        {tableItems.map((item, index) => (
          <Button
            key={index}
            variant={item.destructive ? "destructive" : "ghost"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={item.command}
            title={item.label}
          >
            {item.icon}
          </Button>
        ))}
      </div>
    </div>
  );
};
