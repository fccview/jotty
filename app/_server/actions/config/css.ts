"use server";

import path from "path";
import fs from "fs/promises";
import { Result } from "@/app/_types";
import { isAdmin } from "../users";
import { logAudit } from "@/app/_server/actions/log";

export const saveCustomCSS = async (css: string): Promise<Result<null>> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      await logAudit({
        level: "WARNING",
        action: "custom_css_saved",
        category: "settings",
        success: false,
        errorMessage: "Unauthorized",
      });
      return { success: false, error: "Unauthorized" };
    }

    const cssPath = path.join(process.cwd(), "config", "custom.css");

    try {
      await fs.access(path.dirname(cssPath));
    } catch {
      await fs.mkdir(path.dirname(cssPath), { recursive: true });
    }

    await fs.writeFile(cssPath, css, "utf-8");

    await logAudit({
      level: "INFO",
      action: "custom_css_saved",
      category: "settings",
      success: true,
      metadata: { cssLength: css.length },
    });

    return { success: true, data: null };
  } catch (error) {
    console.error("Error saving custom CSS:", error);
    await logAudit({
      level: "ERROR",
      action: "custom_css_saved",
      category: "settings",
      success: false,
      errorMessage: "Failed to save custom CSS",
    });
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
      return { success: true, data: "" };
    }
  } catch (error) {
    console.error("Error loading custom CSS:", error);
    return { success: false, error: "Failed to load custom CSS" };
  }
};
