import type { User } from "@/app/_types";
import type { PublicTheme } from "@/app/_types/theme";
import { getSettings } from "./settings";
import { loadCustomThemes } from "./themes";
import { themeFor } from "./effective-theme";

const PLAIN_THEME: PublicTheme = { variables: {}, darkVariables: null };

export const ownerThemeFor = async (owner: Pick<User, "preferredTheme"> | null): Promise<PublicTheme> => {
  try {
    const [settings, themes] = await Promise.all([getSettings(), loadCustomThemes()]);
    const { variables, darkVariables } = await themeFor({
      user: { preferredTheme: owner?.preferredTheme },
      customThemes: themes?.["custom-themes"] ?? {},
      isRwMarkable: settings?.isRwMarkable,
      customCss: false,
    });
    return { variables, darkVariables };
  } catch (error) {
    console.error("ownerThemeFor failed:", error);
    return PLAIN_THEME;
  }
};
