"use client";

import { useAppMode } from "@/app/_providers/AppModeProvider";

/**
 * Whether the current user has disabled the rich (Tiptap) editor in favour of
 * the lightweight markdown-only editor. Derives the same flag that previously
 * was inlined as `user?.disableRichEditor === "enable"` across several
 * components, so the minimal-mode branch can be selected consistently.
 */
export const useMinimalMode = (): boolean => {
  const { user } = useAppMode();
  return user?.disableRichEditor === "enable";
};