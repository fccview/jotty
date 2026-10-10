"use client";

import { useEffect, useState } from "react";
import {
  NO_MARKDOWN_FORMATS,
  getMarkdownTextarea,
  markdownFormatsAt,
  sameFormats,
  type MarkdownFormats,
} from "@/app/_utils/markdown-editor-utils";

const CARET_EVENTS = ["selectionchange", "input", "keyup", "mouseup", "focusin"] as const;

export const useMarkdownFormats = (enabled: boolean): MarkdownFormats => {
  const [formats, setFormats] = useState<MarkdownFormats>(NO_MARKDOWN_FORMATS);

  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      const textarea = getMarkdownTextarea();
      if (!textarea) return;
      const next = markdownFormatsAt(textarea.value, textarea.selectionStart);
      setFormats((prev) => (sameFormats(prev, next) ? prev : next));
    };
    CARET_EVENTS.forEach((name) => document.addEventListener(name, refresh, true));
    refresh();
    return () => CARET_EVENTS.forEach((name) => document.removeEventListener(name, refresh, true));
  }, [enabled]);

  return enabled ? formats : NO_MARKDOWN_FORMATS;
};
