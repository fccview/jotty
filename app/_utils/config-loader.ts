import {
  loadCustomThemes as loadThemesServer,
  loadCustomEmojis as loadEmojisServer,
} from "@/app/_server/actions/config";

export interface CustomTheme {
  name: string;
  icon?: string;
  colors: {
    [key: string]: string;
  };
}

export interface CustomEmojis {
  [key: string]: string;
}

export interface ThemeConfig {
  "custom-themes": {
    [key: string]: CustomTheme;
  };
}

export interface EmojiConfig {
  "custom-emojis": CustomEmojis;
}

const getDefaultIcon = (themeName: string) => {
  const lowerName = themeName.toLowerCase();
  if (lowerName.includes("dark")) return "GibbousMoonIcon";
  if (lowerName.includes("light")) return "Sun03Icon";
  if (lowerName.includes("blue")) return "CurvyRightDirectionIcon";
  if (lowerName.includes("green")) return "Tree03Icon";
  if (lowerName.includes("red")) return "FireIcon";
  if (lowerName.includes("purple")) return "PaintBrush04Icon";
  if (lowerName.includes("corporate") || lowerName.includes("business"))
    return "Building02Icon";
  if (lowerName.includes("sunset") || lowerName.includes("orange"))
    return "SunsetIcon";
  return "PaintBrush04Icon";
};

export const loadCustomThemes = async (): Promise<ThemeConfig | null> => {
  try {
    const config = await loadThemesServer();
    return config;
  } catch (error) {
    return null;
  }
};

export const loadCustomEmojis = async (): Promise<EmojiConfig | null> => {
  try {
    const config = await loadEmojisServer();
    return config;
  } catch {
    return null;
  }
};

export const processCustomThemes = (config: ThemeConfig | null) => {
  if (!config || !config["custom-themes"]) {
    return [];
  }

  const themes = Object.entries(config["custom-themes"]).map(([id, theme]) => ({
    id,
    name: theme.name,
    icon: theme.icon || getDefaultIcon(theme.name),
  }));

  return themes;
};

export const processCustomEmojis = (config: EmojiConfig | null) => {
  if (!config || !config["custom-emojis"]) return {};
  return config["custom-emojis"];
};
