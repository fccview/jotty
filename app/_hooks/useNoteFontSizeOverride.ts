import { useEffect } from "react";
import { useSettings } from "@/app/_utils/settings-store";
import { NOTE_FONT_SIZE_VAR, noteFontSizeToPx } from "@/app/_consts/styling";

export const useNoteFontSizeOverride = () => {
  const { noteFontSize } = useSettings();

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
