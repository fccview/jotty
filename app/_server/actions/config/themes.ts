"use server";

import { readFileSync } from "fs";
import { join } from "path";
import path from "path";
import fs from "fs/promises";
import { Result, CustomThemeConfig } from "@/app/_types";
import { isAdmin } from "../users";
import { logAudit } from "@/app/_server/actions/log";
import { validateThemeConfig } from "./validators";

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

export const saveCustomThemes = async (
  themes: CustomThemeConfig
): Promise<Result<null>> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      await logAudit({
        level: "WARNING",
        action: "custom_theme_saved",
        category: "settings",
        success: false,
        errorMessage: "Unauthorized",
      });
      return { success: false, error: "Unauthorized" };
    }

    if (!validateThemeConfig(themes)) {
      await logAudit({
        level: "WARNING",
        action: "custom_theme_saved",
        category: "settings",
        success: false,
        errorMessage: "Invalid theme configuration",
      });
      return { success: false, error: "Invalid theme configuration" };
    }

    const themesPath = path.join(process.cwd(), "config", "themes.json");

    try {
      await fs.access(path.dirname(themesPath));
    } catch {
      await fs.mkdir(path.dirname(themesPath), { recursive: true });
    }

    await fs.writeFile(themesPath, JSON.stringify(themes, null, 2), "utf-8");

    await logAudit({
      level: "INFO",
      action: "custom_theme_saved",
      category: "settings",
      success: true,
      metadata: { themeCount: Object.keys(themes["custom-themes"] || {}).length },
    });

    return { success: true, data: null };
  } catch (error) {
    console.error("Error saving custom themes:", error);
    await logAudit({
      level: "ERROR",
      action: "custom_theme_saved",
      category: "settings",
      success: false,
      errorMessage: "Failed to save custom themes",
    });
    return { success: false, error: "Failed to save custom themes" };
  }
};
