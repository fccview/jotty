import {
  Sun,
  Moon,
  Sunset,
  Waves,
  Trees,
  CloudMoon,
  Palette,
  Terminal,
  Github,
  Monitor,
  Coffee,
  Flower2,
  Flame,
  Palmtree,
  Building,
  Laptop,
  Sparkles,
  LucideIcon,
} from "lucide-react";
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

type IconComponent = LucideIcon | typeof LegacyLogo;

const ICON_MAP: Record<string, IconComponent> = {
  Sun,
  Moon,
  Sunset,
  Waves,
  Trees,
  CloudMoon,
  Palette,
  Terminal,
  Github,
  Monitor,
  Coffee,
  Flower2,
  Flame,
  Palmtree,
  Building,
  Laptop,
  Sparkles,
  LegacyLogo,
};

export const BUILT_IN_THEMES: Array<{
  id: string;
  name: string;
  icon: IconComponent;
}> = [
  { id: "system" as const, name: "System", icon: Laptop },
  { id: "light" as const, name: "Light", icon: Sun },
  { id: "dark" as const, name: "Dark", icon: Moon },
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
  { id: "fccview" as const, name: "fccview", icon: Sparkles },
  { id: "black-white" as const, name: "Black & White", icon: Palette },
  { id: "sunset" as const, name: "Sunset", icon: Sunset },
  { id: "ocean" as const, name: "Ocean", icon: Waves },
  { id: "forest" as const, name: "Forest", icon: Trees },
  { id: "nord" as const, name: "Nord", icon: CloudMoon },
  { id: "dracula" as const, name: "Dracula", icon: Palette },
  { id: "monokai" as const, name: "Monokai", icon: Terminal },
  { id: "github-dark" as const, name: "GitHub Dark", icon: Github },
  { id: "tokyo-night" as const, name: "Tokyo Night", icon: Monitor },
  { id: "catppuccin" as const, name: "Catppuccin", icon: Coffee },
  { id: "rose-pine" as const, name: "Rose Pine", icon: Flower2 },
  { id: "gruvbox" as const, name: "Gruvbox", icon: Flame },
  { id: "solarized-dark" as const, name: "Solarized Dark", icon: Palmtree },
];

export const getAllThemes = async () => {
  const customConfig = await loadCustomThemes();
  const customThemes = processCustomThemes(customConfig);

  const allThemes = [...BUILT_IN_THEMES];

  customThemes.forEach((customTheme) => {
    const iconComponent =
      ICON_MAP[customTheme.icon as keyof typeof ICON_MAP] || Palette;
    allThemes.push({
      id: customTheme.id as any,
      name: customTheme.name,
      icon: iconComponent,
    });
  });

  return allThemes;
};

export const getBuiltInThemes = () => BUILT_IN_THEMES;

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
