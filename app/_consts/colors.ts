import { loadCustomThemes } from "@/app/_server/actions/config";

function rgbStringToHex(rgbString: string): string {
  const [r, g, b] = rgbString.split(" ").map(Number);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export async function getAllThemeColors() {
  const colors: { [key: string]: { background: string; primary: string } } = {};

  const builtInThemes = {
    light: { background: "255 255 255", primary: "139 59 208" },
    dark: { background: "12 20 53", primary: "139 59 208" },
    "rwmarkable-light": { background: "255 255 255", primary: "37 99 235" },
    "rwmarkable-dark": { background: "17 24 39", primary: "59 130 246" },
    fccview: { background: "12 20 53", primary: "205 6 157" },
    "black-white": { background: "10 10 10", primary: "90 90 90" },
    sunset: { background: "254 242 242", primary: "220 38 38" },
    ocean: { background: "239 246 255", primary: "37 99 235" },
    forest: { background: "240 253 244", primary: "22 163 74" },
    nord: { background: "236 239 244", primary: "94 129 172" },
    dracula: { background: "40 42 54", primary: "189 147 249" },
    monokai: { background: "39 40 34", primary: "253 151 31" },
    "github-dark": { background: "13 17 23", primary: "47 129 247" },
    "tokyo-night": { background: "26 27 38", primary: "125 207 255" },
    catppuccin: { background: "30 30 46", primary: "137 180 250" },
    "rose-pine": { background: "25 23 36", primary: "196 167 231" },
    gruvbox: { background: "40 40 40", primary: "250 189 47" },
    "solarized-dark": { background: "0 43 54", primary: "38 139 210" },
  };

  Object.entries(builtInThemes).forEach(([themeName, themeColors]) => {
    colors[themeName] = {
      background: rgbStringToHex(themeColors.background),
      primary: rgbStringToHex(themeColors.primary),
    };
  });

  try {
    const customConfig = await loadCustomThemes();
    if (customConfig && customConfig["custom-themes"]) {
      Object.entries(customConfig["custom-themes"]).forEach(
        ([themeId, theme]: [string, any]) => {
          try {
            const themeColors = theme.colors;
            if (
              themeColors &&
              themeColors["--background"] &&
              themeColors["--primary"]
            ) {
              colors[themeId] = {
                background: rgbStringToHex(themeColors["--background"]),
                primary: rgbStringToHex(themeColors["--primary"]),
              };
            } else {
              console.warn(
                `Custom theme ${themeId} is missing required color properties`
              );
            }
          } catch (themeError) {
            console.warn(
              `Failed to load colors for custom theme ${themeId}:`,
              themeError
            );
          }
        }
      );
    }
  } catch (error) {
    console.error("Failed to load custom theme colors:", error);
  }

  return colors;
}

export async function getThemeColors(themeName: string) {
  const allColors = await getAllThemeColors();

  if (themeName === "system") {
    return allColors["dark"] || { background: "#0c1435", primary: "#8b3bd0" };
  }

  if (allColors[themeName]) {
    return allColors[themeName];
  }

  console.warn(`Theme '${themeName}' not found, falling back to dark theme`);
  return allColors["dark"] || { background: "#0c1435", primary: "#8b3bd0" };
}
