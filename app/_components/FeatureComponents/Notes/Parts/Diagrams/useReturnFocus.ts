"use client";

import { useCallback } from "react";
import type { NodeViewProps } from "@tiptap/react";

export const useReturnFocus = (editor: NodeViewProps["editor"], getPos: NodeViewProps["getPos"]) =>
  useCallback(() => {
    if (editor.isDestroyed || !editor.isEditable) return;
    const pos = getPos();
    if (typeof pos !== "number") return;
    editor.chain().setNodeSelection(pos).focus(undefined, { scrollIntoView: false }).run();
  }, [editor, getPos]);
