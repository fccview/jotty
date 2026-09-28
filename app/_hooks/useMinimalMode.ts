"use client";

import { useAppMode } from "@/app/_providers/AppModeProvider";

export const useMinimalMode = (): boolean => {
  const { user } = useAppMode();
  return user?.disableRichEditor === "enable";
};
