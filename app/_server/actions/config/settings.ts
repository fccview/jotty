"use server";

import path from "path";
import fs from "fs/promises";
import { Result, AppSettings } from "@/app/_types";
import { getCurrentUser, isAdmin } from "../users";
import { revalidatePath, revalidateTag } from "next/cache";
import { MAX_FILE_SIZE } from "@/app/_consts/files";
import { logAudit } from "@/app/_server/actions/log";

const DATA_SETTINGS_PATH = path.join(process.cwd(), "data", "settings.json");
const CONFIG_SETTINGS_PATH = path.join(
  process.cwd(),
  "config",
  "settings.json",
);

export const getSettings = async () => {
  const defaultSettings = {
    appName: "jotty·page",
    appDescription:
      "A simple, fast, and lightweight checklist and notes application",
    "16x16Icon": "",
    "32x32Icon": "",
    "180x180Icon": "",
    "512x512Icon": "",
    "192x192Icon": "",
    notifyNewUpdates: "yes",
    maximumFileSize: MAX_FILE_SIZE,
    parseContent: "yes",
    adminContentAccess: "yes",
    editor: {
      enableSlashCommands: true,
      enableBubbleMenu: true,
      enableTableToolbar: true,
      enableBilateralLinks: true,
      drawioProxyEnabled: false,
      historyEnabled: false,
    },
  };

  try {
    const dataSettingsPath = path.join(process.cwd(), "data", "settings.json");
    let settings;
    try {
      const content = await fs.readFile(dataSettingsPath, "utf-8");
      settings = JSON.parse(content);
    } catch {
      const configSettingsPath = path.join(
        process.cwd(),
        "config",
        "settings.json",
      );
      const content = await fs.readFile(configSettingsPath, "utf-8");
      settings = JSON.parse(content);
    }

    if (!settings.editor) {
      settings.editor = defaultSettings.editor;
    } else {
      settings.editor = {
        ...defaultSettings.editor,
        ...settings.editor,
      };
    }

    return settings;
  } catch (error) {
    return defaultSettings;
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
          "utf-8",
        );
        settings = JSON.parse(settingsContent);
      } catch {
        settings = {
          appName: "",
          appDescription: "",
          "16x16Icon": "",
          "32x32Icon": "",
          "180x180Icon": "",
          "512x512Icon": "",
          "192x192Icon": "",
          notifyNewUpdates: "yes",
          parseContent: "yes",
          maximumFileSize: MAX_FILE_SIZE,
          adminContentAccess: "yes",
          hideLanguageSelector: "no",
          editor: {
            enableSlashCommands: true,
            enableBubbleMenu: true,
            enableTableToolbar: true,
            enableBilateralLinks: true,
            drawioProxyEnabled: false,
          },
        };
      }
    }

    if (!settings.adminContentAccess) {
      settings.adminContentAccess = "yes";
    }

    if (!settings.editor) {
      settings.editor = {
        enableSlashCommands: true,
        enableBubbleMenu: true,
        enableTableToolbar: true,
        enableBilateralLinks: true,
        drawioProxyEnabled: false,
      };
    }

    return { success: true, data: settings };
  } catch (error) {
    console.error("Error reading app settings:", error);
    return { success: false, error: "Failed to read settings" };
  }
};

export const updateAppSettings = async (
  formData: FormData,
): Promise<Result<null>> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.isAdmin) {
      await logAudit({
        level: "WARNING",
        action: "app_settings_updated",
        category: "settings",
        success: false,
        errorMessage: "Unauthorized: Admin access required",
      });
      return { success: false, error: "Unauthorized: Admin access required" };
    }

    if (!currentUser?.isSuperAdmin) {
      await logAudit({
        level: "WARNING",
        action: "app_settings_updated",
        category: "settings",
        success: false,
        errorMessage: "Unauthorized: Super admin access required",
      });
      return {
        success: false,
        error: "Unauthorized: Only the system owner can modify app settings",
      };
    }

    const appName = (formData.get("appName") as string) || "";
    const appDescription = (formData.get("appDescription") as string) || "";
    const icon16x16 = (formData.get("16x16Icon") as string) || "";
    const icon32x32 = (formData.get("32x32Icon") as string) || "";
    const icon180x180 = (formData.get("180x180Icon") as string) || "";
    const icon512x512 = (formData.get("512x512Icon") as string) || "";
    const icon192x192 = (formData.get("192x192Icon") as string) || "";
    const notifyNewUpdates =
      (formData.get("notifyNewUpdates") as "yes" | "no") || "yes";
    const parseContent =
      (formData.get("parseContent") as "yes" | "no") || "yes";
    const maximumFileSize =
      Number(formData.get("maximumFileSize")) || MAX_FILE_SIZE;
    const adminContentAccess =
      (formData.get("adminContentAccess") as "yes" | "no") || "yes";
    const maxLogAgeDays = Number(formData.get("maxLogAgeDays")) || 0;
    const hideLanguageSelector =
      (formData.get("hideLanguageSelector") as "yes" | "no") || "no";

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
      "512x512Icon": icon512x512,
      "192x192Icon": icon192x192,
      notifyNewUpdates: notifyNewUpdates,
      parseContent: parseContent,
      maximumFileSize: maximumFileSize,
      adminContentAccess: adminContentAccess,
      maxLogAgeDays: maxLogAgeDays,
      hideLanguageSelector: hideLanguageSelector,
      editor: editorSettings,
    };

    const dataDir = path.dirname(DATA_SETTINGS_PATH);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }

    await fs.writeFile(DATA_SETTINGS_PATH, JSON.stringify(settings, null, 2));

    await logAudit({
      level: "INFO",
      action: "app_settings_updated",
      category: "settings",
      success: true,
      metadata: {
        appName,
        notifyNewUpdates,
        parseContent,
        maximumFileSize,
        editorSettings,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/");
    revalidateTag("layout-notes", { expire: 0 });
    revalidateTag("layout-checklists", { expire: 0 });

    return { success: true, data: null };
  } catch (error) {
    console.error("Error saving app settings:", error);
    await logAudit({
      level: "ERROR",
      action: "app_settings_updated",
      category: "settings",
      success: false,
      errorMessage: "Failed to save settings",
    });
    return { success: false, error: "Failed to save settings" };
  }
};
