import {
  Sun03Icon,
  GibbousMoonIcon,
  SunsetIcon,
  CurvyRightDirectionIcon,
  Tree03Icon,
  MoonCloudIcon,
  PaintBrush04Icon,
  GithubIcon,
  Tv02Icon,
  Coffee02Icon,
  FlowerIcon,
  FireIcon,
  Leaf04Icon,
  Building02Icon,
  LaptopIcon,
  SourceCodeIcon,
  Tree07Icon,
  LaptopProgrammingIcon,
} from "hugeicons-react";

import {
  loadCustomThemes,
  processCustomThemes,
} from "@/app/_utils/config-loader";
import { LegacyLogo } from "@/app/_components/GlobalComponents/Layout/Logo/LegacyLogo";

const LegacyLogoBlue = (props: any) => (
  <LegacyLogo
    {...props}
    fillClass="fill-rwmarkable"
    strokeClass="stroke-rwmarkable"
  />
);

const ICON_MAP: Record<string, any> = {
  Sun03Icon,
  GibbousMoonIcon,
  SunsetIcon,
  CurvyRightDirectionIcon,
  Tree03Icon,
  MoonCloudIcon,
  PaintBrush04Icon,
  LaptopIcon,
  GithubIcon,
  Tv02Icon,
  Coffee02Icon,
  FlowerIcon,
  FireIcon,
  Leaf04Icon,
  Building02Icon,
  LaptopProgrammingIcon,
  SourceCodeIcon,
  LegacyLogo,
};

export const BUILT_IN_THEMES: Array<{
  id: string;
  name: string;
  icon: any;
}> = [
  { id: "system" as const, name: "System", icon: LaptopIcon },
  { id: "light" as const, name: "Light", icon: Sun03Icon },
  { id: "dark" as const, name: "Dark", icon: GibbousMoonIcon },
  {
    id: "rwmarkable-light" as const,
    name: "RWMarkable Light",
    icon: LegacyLogoBlue,
  },
  {
    id: "rwmarkable-dark" as const,
    name: "RWMarkable Dark",
    icon: LegacyLogoBlue,
  },
  { id: "fccview" as const, name: "fccview", icon: SourceCodeIcon },
  { id: "sakura-blue" as const, name: "oxalorg/sakura-blue", icon: FlowerIcon },
  { id: "sakura-red" as const, name: "oxalorg/sakura-red", icon: FlowerIcon },
  { id: "black-white" as const, name: "Black & White", icon: PaintBrush04Icon },
  { id: "sunset" as const, name: "SunsetIcon", icon: SunsetIcon },
  { id: "ocean" as const, name: "Ocean", icon: CurvyRightDirectionIcon },
  { id: "forest" as const, name: "Forest", icon: Tree03Icon },
  { id: "nord" as const, name: "Nord", icon: MoonCloudIcon },
  { id: "dracula" as const, name: "Dracula", icon: PaintBrush04Icon },
  { id: "monokai" as const, name: "Monokai", icon: LaptopProgrammingIcon },
  { id: "github-dark" as const, name: "GitHub Dark", icon: GithubIcon },
  { id: "tokyo-night" as const, name: "Tokyo Night", icon: Tv02Icon },
  { id: "catppuccin" as const, name: "Catppuccin", icon: Coffee02Icon },
  { id: "rose-pine" as const, name: "Rose Pine", icon: Tree07Icon },
  { id: "gruvbox" as const, name: "Gruvbox", icon: FireIcon },
  { id: "solarized-dark" as const, name: "Solarized Dark", icon: Leaf04Icon },
];

export const getAllThemes = async () => {
  const customConfig = await loadCustomThemes();
  const customThemes = processCustomThemes(customConfig);

  const allThemes = [...BUILT_IN_THEMES];

  customThemes.forEach((customTheme) => {
    const iconComponent =
      ICON_MAP[customTheme.icon as keyof typeof ICON_MAP] || PaintBrush04Icon;
    allThemes.push({
      id: customTheme.id as any,
      name: customTheme.name,
      icon: iconComponent,
    });
  });

  return allThemes;
};

export const getCustomThemeColors = async () => {
  const customConfig = await loadCustomThemes();

  if (!customConfig || !customConfig["custom-themes"]) {
    return {};
  }

  const colors: { [key: string]: any } = {};

  Object.entries(customConfig["custom-themes"]).forEach(([themeId, theme]) => {
    colors[themeId] = theme.colors;
  });

  return colors;
};

export const rgbToHex = (rgbString: string): string => {
  const [r, g, b] = rgbString.split(" ").map(Number);
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

const THEME_BACKGROUND_COLORS: Record<string, string> = {
  light: rgbToHex("255 255 255"),
  dark: rgbToHex("12 20 53"),
  "rwmarkable-light": rgbToHex("255 255 255"),
  "rwmarkable-dark": rgbToHex("17 24 39"),
  fccview: rgbToHex("12 20 53"),
  "black-white": rgbToHex("10 10 10"),
  sunset: rgbToHex("254 242 242"),
  ocean: rgbToHex("240 253 250"),
  forest: rgbToHex("248 250 252"),
  nord: rgbToHex("46 52 64"),
  dracula: rgbToHex("40 42 54"),
  monokai: rgbToHex("39 40 34"),
  "github-dark": rgbToHex("13 17 23"),
  "tokyo-night": rgbToHex("26 27 38"),
  catppuccin: rgbToHex("30 30 46"),
  "rose-pine": rgbToHex("25 23 36"),
  gruvbox: rgbToHex("40 40 40"),
  "solarized-dark": rgbToHex("0 43 54"),
  sakura: rgbToHex("249 249 249"),
  system: rgbToHex("255 255 255"),
};

export const getThemeBackgroundColor = (themeId: string): string => {
  return THEME_BACKGROUND_COLORS[themeId] || THEME_BACKGROUND_COLORS["dark"];
};

export const themeInitScript = (customThemesData?: string) => `
(function() {
  try {
    const isRwMarkable = document.documentElement.getAttribute('data-rwmarkable') === 'true';
    const userPreferredTheme = document.documentElement.getAttribute('data-user-theme') || '';

    const settings = localStorage.getItem('checklist-settings');
    let localStorageTheme = 'system';

    if (settings) {
      const parsed = JSON.parse(settings);
      localStorageTheme = parsed.state?.theme || 'system';
    }

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let resolvedTheme;

    if (localStorageTheme && localStorageTheme !== 'system') {
      resolvedTheme = localStorageTheme;
    } else if (userPreferredTheme && userPreferredTheme !== 'system') {
      resolvedTheme = userPreferredTheme;
    } else {
      if (isRwMarkable) {
        resolvedTheme = isDark ? 'rwmarkable-dark' : 'rwmarkable-light';
      } else {
        resolvedTheme = isDark ? 'dark' : 'light';
      }
    }

    const customThemes = ${customThemesData || "{}"};

    if (customThemes[resolvedTheme]) {
      const colors = customThemes[resolvedTheme].colors;

      Object.entries(colors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });
    }

    document.documentElement.classList.add(resolvedTheme);
  } catch (e) {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isRwMarkable = document.documentElement.getAttribute('data-rwmarkable') === 'true';
    const fallbackTheme = isRwMarkable ?
      (isDark ? 'rwmarkable-dark' : 'rwmarkable-light') :
      (isDark ? 'dark' : 'light');
    document.documentElement.classList.add(fallbackTheme);
  }
})();
`;
