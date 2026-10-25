import { BUILT_IN_THEMES } from "@/app/_consts/themes";
import { SYSTEM_THEME } from "@/app/_consts/quick-settings";
import { DEFAULT_BORDER_RADIUS, clampRadius, radiusToRem } from "@/app/_consts/styling";
import { ThemeMode, type EffectiveTheme, type ThemeVariables } from "@/app/_types/theme";
import type { CustomThemeConfig, SanitisedUser } from "@/app/_types";
import { ROOT_PALETTE, readPalettes, resolveVars } from "./palettes";

type CustomThemes = CustomThemeConfig["custom-themes"];

export interface ThemeSources {
  user: Pick<SanitisedUser, "preferredTheme" | "preferredBorderRadius">;
  customThemes: CustomThemes;
  isRwMarkable?: boolean;
  adminRadius?: number;
  customCss: boolean;
}

enum SystemPalette {
  LIGHT = "light",
  DARK = "dark",
  RW_LIGHT = "rwmarkable-light",
  RW_DARK = "rwmarkable-dark",
}

const builtInName = (id: string) => BUILT_IN_THEMES.find((theme) => theme.id === id)?.name;

const paletteOf = (
  palettes: Record<string, ThemeVariables>,
  id: string,
  customThemes: CustomThemes,
): ThemeVariables =>
  resolveVars({
    ...palettes[ROOT_PALETTE],
    ...palettes[id],
    ...customThemes[id]?.colors,
  });

export const radiusFor = (preferred?: number, adminRadius?: number) => {
  const value = typeof preferred === "number" ? preferred : adminRadius;
  if (typeof value !== "number" || clampRadius(value) === DEFAULT_BORDER_RADIUS) return null;
  return radiusToRem(value);
};

export const themeFor = async (sources: ThemeSources): Promise<EffectiveTheme> => {
  const { user, customThemes, isRwMarkable, adminRadius, customCss } = sources;
  const palettes = await readPalettes();
  const preferred = user.preferredTheme || SYSTEM_THEME;
  const name = customThemes[preferred]?.name ?? builtInName(preferred);
  const shared = { radius: radiusFor(user.preferredBorderRadius, adminRadius), customCss };

  if (preferred !== SYSTEM_THEME && name) {
    return {
      id: preferred,
      name,
      mode: ThemeMode.FIXED,
      variables: paletteOf(palettes, preferred, customThemes),
      darkVariables: null,
      ...shared,
    };
  }

  const light = isRwMarkable ? SystemPalette.RW_LIGHT : SystemPalette.LIGHT;
  const dark = isRwMarkable ? SystemPalette.RW_DARK : SystemPalette.DARK;

  return {
    id: SYSTEM_THEME,
    name: builtInName(SYSTEM_THEME) ?? SYSTEM_THEME,
    mode: ThemeMode.SYSTEM,
    variables: paletteOf(palettes, light, customThemes),
    darkVariables: paletteOf(palettes, dark, customThemes),
    ...shared,
  };
};
