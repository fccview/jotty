import { rgbToHex } from "@/app/_consts/themes";

export const THEME_COLOR_META = "theme-color";

const readBackgroundHex = () => {
  const background = getComputedStyle(document.documentElement)
    .getPropertyValue("--background")
    .trim();
  const channels = background.split(/[\s,]+/).map(Number);
  if (channels.length < 3 || !channels.slice(0, 3).every(Number.isFinite)) return null;
  return rgbToHex(channels.slice(0, 3).map(Math.round).join(" "));
};

export const syncThemeColorMeta = () => {
  const meta = document.querySelector<HTMLMetaElement>(`meta[name="${THEME_COLOR_META}"]`);
  const color = readBackgroundHex();
  if (meta && color && meta.content !== color) meta.content = color;
};
