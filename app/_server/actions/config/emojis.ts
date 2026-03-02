"use server";

import { readFileSync } from "fs";
import { join } from "path";
import path from "path";
import fs from "fs/promises";
import { Result, CustomEmojiConfig } from "@/app/_types";
import { isAdmin } from "../users";
import { logAudit } from "@/app/_server/actions/log";
import { validateEmojiConfig } from "./validators";

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

export const saveCustomEmojis = async (
  emojis: CustomEmojiConfig
): Promise<Result<null>> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      await logAudit({
        level: "WARNING",
        action: "custom_emoji_saved",
        category: "settings",
        success: false,
        errorMessage: "Unauthorized",
      });
      return { success: false, error: "Unauthorized" };
    }

    if (!validateEmojiConfig(emojis)) {
      await logAudit({
        level: "WARNING",
        action: "custom_emoji_saved",
        category: "settings",
        success: false,
        errorMessage: "Invalid emoji configuration",
      });
      return { success: false, error: "Invalid emoji configuration" };
    }

    const emojisPath = path.join(process.cwd(), "config", "emojis.json");

    try {
      await fs.access(path.dirname(emojisPath));
    } catch {
      await fs.mkdir(path.dirname(emojisPath), { recursive: true });
    }

    await fs.writeFile(emojisPath, JSON.stringify(emojis, null, 2), "utf-8");

    await logAudit({
      level: "INFO",
      action: "custom_emoji_saved",
      category: "settings",
      success: true,
      metadata: { emojiCount: Object.keys(emojis["custom-emojis"] || {}).length },
    });

    return { success: true, data: null };
  } catch (error) {
    console.error("Error saving custom emojis:", error);
    await logAudit({
      level: "ERROR",
      action: "custom_emoji_saved",
      category: "settings",
      success: false,
      errorMessage: "Failed to save custom emojis",
    });
    return { success: false, error: "Failed to save custom emojis" };
  }
};
