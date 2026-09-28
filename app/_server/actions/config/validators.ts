import { AppSettings, CustomThemeConfig, CustomEmojiConfig } from "@/app/_types";

export const validateThemeConfig = (config: any): config is CustomThemeConfig => {
  if (!config || typeof config !== "object") return false;
  if (!config["custom-themes"] || typeof config["custom-themes"] !== "object")
    return false;

  for (const [themeId, theme] of Object.entries(config["custom-themes"])) {
    if (typeof theme !== "object" || !theme) return false;
    const themeObj = theme as any;
    if (typeof themeObj.name !== "string") return false;
    if (themeObj.icon && typeof themeObj.icon !== "string") return false;
    if (!themeObj.colors || typeof themeObj.colors !== "object") return false;

    for (const [colorKey, colorValue] of Object.entries(themeObj.colors)) {
      if (typeof colorValue !== "string") return false;
    }
  }

  return true;
};

export const validateEmojiConfig = (config: any): config is CustomEmojiConfig => {
  if (!config || typeof config !== "object") return false;
  if (!config["custom-emojis"] || typeof config["custom-emojis"] !== "object")
    return false;

  for (const [key, value] of Object.entries(config["custom-emojis"])) {
    if (typeof value !== "string") return false;
  }

  return true;
};

type EditorSettings = AppSettings["editor"];

const EDITOR_FIELD_TYPES: Record<keyof EditorSettings, "boolean" | "string"> = {
  enableSlashCommands: "boolean",
  enableBubbleMenu: "boolean",
  enableTableToolbar: "boolean",
  enableBilateralLinks: "boolean",
  enableTags: "boolean",
  drawioUrl: "string",
  drawioProxyEnabled: "boolean",
  historyEnabled: "boolean",
};

export type EditorVerdict =
  | { patch: Partial<EditorSettings> }
  | { badField: string | null };

export const checkEditor = (raw: unknown): EditorVerdict => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { badField: null };
  }

  const incoming = raw as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  for (const [field, kind] of Object.entries(EDITOR_FIELD_TYPES)) {
    if (!(field in incoming)) continue;
    if (typeof incoming[field] !== kind) return { badField: field };
    patch[field] = incoming[field];
  }

  return { patch: patch as Partial<EditorSettings> };
};
