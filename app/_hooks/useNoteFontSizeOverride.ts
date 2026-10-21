import { useEffect } from "react";
import { useQuickValue } from "@/app/_hooks/settings/useQuickSetting";
import { QuickSettingId } from "@/app/_consts/quick-settings";
import { NOTE_FONT_SIZE_VAR, noteFontSizeToPx } from "@/app/_consts/styling";

export const useNoteFontSizeOverride = () => {
  const noteFontSize = useQuickValue(QuickSettingId.NOTE_FONT_SIZE);

  useEffect(() => {
    const root = document.documentElement;

    if (typeof noteFontSize === "number") {
      root.style.setProperty(NOTE_FONT_SIZE_VAR, noteFontSizeToPx(noteFontSize));
    } else {
      root.style.removeProperty(NOTE_FONT_SIZE_VAR);
    }
  }, [noteFontSize]);

  return noteFontSize;
};
