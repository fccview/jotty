"use server";

import { readFileSync } from "fs";
import { join } from "path";
import path from "path";
import fs from "fs/promises";
import { Result } from "@/app/_types";
import { getCurrentUser, isAdmin } from "../users";
import { revalidatePath } from "next/cache";
import { getListById } from "../checklist";
import { Metadata } from "next";
import { Modes } from "@/app/_types/enums";
import { getNoteById } from "../note";
import { AppSettings } from "@/app/_types";
import { MAX_FILE_SIZE } from "@/app/_consts/files";

const DATA_SETTINGS_PATH = path.join(process.cwd(), "data", "settings.json");
const CONFIG_SETTINGS_PATH = path.join(
  process.cwd(),
  "config",
  "settings.json"
);

interface ThemeConfig {
  "custom-themes": {
    [key: string]: {
      name: string;
      icon?: string;
      colors: {
        [key: string]: string;
      };
    };
  };
}

interface EmojiConfig {
  "custom-emojis": {
    [key: string]: string;
  };
}

const validateThemeConfig = (config: any): config is ThemeConfig => {
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

const validateEmojiConfig = (config: any): config is EmojiConfig => {
  if (!config || typeof config !== "object") return false;
  if (!config["custom-emojis"] || typeof config["custom-emojis"] !== "object")
    return false;

  for (const [key, value] of Object.entries(config["custom-emojis"])) {
    if (typeof value !== "string") return false;
  }

  return true;
};

export const loadCustomThemes = async () => {
  try {
    let configPath = join(process.cwd(), "config", "themes.json");
    let configContent;

    try {
      configContent = readFileSync(configPath, "utf-8");
    } catch {
      configPath = join(process.cwd(), "_config", "themes.json");
      configContent = readFileSync(configPath, "utf-8");
    }

    const config = JSON.parse(configContent);

    if (!validateThemeConfig(config)) {
      console.warn("Invalid themes.json format, using empty config");
      return { "custom-themes": {} };
    }

    return config;
  } catch (error) {
    return { "custom-themes": {} };
  }
};

export const loadCustomEmojis = async () => {
  try {
    let configPath = join(process.cwd(), "config", "emojis.json");
    let configContent;

    try {
      configContent = readFileSync(configPath, "utf-8");
    } catch {
      configPath = join(process.cwd(), "_config", "emojis.json");
      configContent = readFileSync(configPath, "utf-8");
    }

    const config = JSON.parse(configContent);

    if (!validateEmojiConfig(config)) {
      console.warn("Invalid emojis.json format, using empty config");
      return { "custom-emojis": {} };
    }

    return config;
  } catch (error) {
    return { "custom-emojis": {} };
  }
};

export const getSettings = async () => {
  try {
    const dataSettingsPath = path.join(process.cwd(), "data", "settings.json");
    try {
      const settings = await fs.readFile(dataSettingsPath, "utf-8");
      return JSON.parse(settings);
    } catch {
      const configSettingsPath = path.join(
        process.cwd(),
        "config",
        "settings.json"
      );
      const settings = await fs.readFile(configSettingsPath, "utf-8");
      return JSON.parse(settings);
    }
  } catch (error) {
    return {
      appName: "jotty·page",
      appDescription:
        "A simple, fast, and lightweight checklist and notes application",
      "16x16Icon": "/app-icons/favicon-16x16.png",
      "32x32Icon": "/app-icons/favicon-32x32.png",
      "180x180Icon": "/app-icons/apple-touch-icon.png",
      notifyNewUpdates: "yes",
      maximumFileSize: MAX_FILE_SIZE,
      editor: {
        enableSlashCommands: true,
        enableBubbleMenu: true,
        enableTableToolbar: true,
        enableBilateralLinks: true,
      },
    };
  }
};

export const getAppSettings = async (): Promise<Result<AppSettings>> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { success: false, error: "Unauthorized" };
    }

    let settings: AppSettings;
    try {
      const settingsContent = await fs.readFile(DATA_SETTINGS_PATH, "utf-8");
      settings = JSON.parse(settingsContent);
    } catch {
      try {
        const settingsContent = await fs.readFile(
          CONFIG_SETTINGS_PATH,
          "utf-8"
        );
        settings = JSON.parse(settingsContent);
      } catch {
        settings = {
          appName: "",
          appDescription: "",
          "16x16Icon": "",
          "32x32Icon": "",
          "180x180Icon": "",
          notifyNewUpdates: "yes",
          maximumFileSize: MAX_FILE_SIZE,
          editor: {
            enableSlashCommands: true,
            enableBubbleMenu: true,
            enableTableToolbar: true,
            enableBilateralLinks: true,
          },
        };
      }
    }

    if (!settings.editor) {
      settings.editor = {
        enableSlashCommands: true,
        enableBubbleMenu: true,
        enableTableToolbar: true,
        enableBilateralLinks: true,
      };
    }

    return { success: true, data: settings };
  } catch (error) {
    console.error("Error reading app settings:", error);
    return { success: false, error: "Failed to read settings" };
  }
};

export const updateAppSettings = async (
  formData: FormData
): Promise<Result<null>> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { success: false, error: "Unauthorized" };
    }

    const appName = (formData.get("appName") as string) || "";
    const appDescription = (formData.get("appDescription") as string) || "";
    const icon16x16 = (formData.get("16x16Icon") as string) || "";
    const icon32x32 = (formData.get("32x32Icon") as string) || "";
    const icon180x180 = (formData.get("180x180Icon") as string) || "";
    const notifyNewUpdates =
      (formData.get("notifyNewUpdates") as "yes" | "no") || "yes";
    const maximumFileSize =
      Number(formData.get("maximumFileSize")) || MAX_FILE_SIZE;

    let editorSettings = {
      enableSlashCommands: true,
      enableBubbleMenu: true,
      enableTableToolbar: true,
      enableBilateralLinks: true,
    };

    const editorData = formData.get("editor") as string;
    if (editorData) {
      try {
        editorSettings = JSON.parse(editorData);
      } catch (error) {
        console.warn("Failed to parse editor settings, using defaults");
      }
    }

    const settings: AppSettings = {
      appName,
      appDescription,
      "16x16Icon": icon16x16,
      "32x32Icon": icon32x32,
      "180x180Icon": icon180x180,
      notifyNewUpdates: notifyNewUpdates,
      maximumFileSize: maximumFileSize,
      editor: editorSettings,
    };

    const dataDir = path.dirname(DATA_SETTINGS_PATH);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }

    await fs.writeFile(DATA_SETTINGS_PATH, JSON.stringify(settings, null, 2));

    revalidatePath("/admin");
    revalidatePath("/");

    return { success: true, data: null };
  } catch (error) {
    console.error("Error saving app settings:", error);
    return { success: false, error: "Failed to save settings" };
  }
};

export const uploadAppIcon = async (
  formData: FormData
): Promise<Result<{ url: string; filename: string }>> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("file") as File;
    const iconType = formData.get("iconType") as string;

    if (!file) {
      return { success: false, error: "No file provided" };
    }

    if (!["16x16Icon", "32x32Icon", "180x180Icon"].includes(iconType)) {
      return { success: false, error: "Invalid icon type" };
    }

    if (!file.type.startsWith("image/")) {
      return { success: false, error: "File must be an image" };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "File size must be less than 5MB" };
    }

    const uploadsDir = path.join(process.cwd(), "data", "uploads", "app-icons");
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const extension = path.extname(file.name);
    const filename = `${iconType}-${timestamp}${extension}`;
    const filepath = path.join(uploadsDir, filename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filepath, buffer);

    const publicUrl = `/api/app-icons/${filename}`;

    return {
      success: true,
      data: { url: publicUrl, filename },
    };
  } catch (error) {
    console.error("Error uploading app icon:", error);
    return { success: false, error: "Failed to upload icon" };
  }
};

export const getMedatadaTitle = async (
  appMode: Modes,
  id: string,
  category?: string
): Promise<Metadata> => {
  const user = await getCurrentUser();
  const settings = await getSettings();
  const defaultTitle = appMode === Modes.CHECKLISTS ? "Checklist" : "Note";

  const ogName = settings?.isRwMarkable ? "rwMarkable" : "jotty·page";
  const appName = settings?.appName || ogName;

  const item =
    appMode === Modes.CHECKLISTS
      ? await getListById(id, undefined, category)
      : await getNoteById(id, category);

  return {
    title: `${item?.title || defaultTitle} - ${appName}`,
  };
};

export const readPackageVersion = async (): Promise<Result<string>> => {
  try {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);
    return { success: true, data: packageJson.version };
  } catch (error) {
    console.error("Error reading package.json version:", error);
    return { success: false, error: "Failed to read package version" };
  }
};

export const saveCustomCSS = async (css: string): Promise<Result<null>> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { success: false, error: "Unauthorized" };
    }

    const cssPath = path.join(process.cwd(), "config", "custom.css");

    try {
      await fs.access(path.dirname(cssPath));
    } catch {
      await fs.mkdir(path.dirname(cssPath), { recursive: true });
    }

    await fs.writeFile(cssPath, css, "utf-8");

    return { success: true, data: null };
  } catch (error) {
    console.error("Error saving custom CSS:", error);
    return { success: false, error: "Failed to save custom CSS" };
  }
};

export const loadCustomCSS = async (): Promise<Result<string>> => {
  try {
    const cssPath = path.join(process.cwd(), "config", "custom.css");

    try {
      const css = await fs.readFile(cssPath, "utf-8");
      return { success: true, data: css };
    } catch {
      // File doesn't exist, return empty CSS
      return { success: true, data: "" };
    }
  } catch (error) {
    console.error("Error loading custom CSS:", error);
    return { success: false, error: "Failed to load custom CSS" };
  }
};

export const saveCustomThemes = async (
  themes: ThemeConfig
): Promise<Result<null>> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { success: false, error: "Unauthorized" };
    }

    if (!validateThemeConfig(themes)) {
      return { success: false, error: "Invalid theme configuration" };
    }

    const themesPath = path.join(process.cwd(), "config", "themes.json");

    try {
      await fs.access(path.dirname(themesPath));
    } catch {
      await fs.mkdir(path.dirname(themesPath), { recursive: true });
    }

    await fs.writeFile(themesPath, JSON.stringify(themes, null, 2), "utf-8");

    return { success: true, data: null };
  } catch (error) {
    console.error("Error saving custom themes:", error);
    return { success: false, error: "Failed to save custom themes" };
  }
};
