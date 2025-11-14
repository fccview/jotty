"use server";

import { getCurrentUser } from "@/app/_server/actions/users";
import {
  DATA_DIR,
  SESSION_DATA_FILE,
  SESSIONS_FILE,
  USERS_DIR,
  USERS_FILE,
} from "@/app/_consts/files";
import fs from "fs/promises";
import path from "path";
import { Modes } from "@/app/_types/enums";

export interface OrderData {
  categories?: string[];
  items?: string[];
}

export const ensureCorDirsAndFiles = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  const coreDirAndFiles = {
    dirs: [USERS_DIR],
    files: [USERS_FILE, SESSIONS_FILE, SESSION_DATA_FILE],
  };

  try {
    for (const dir of coreDirAndFiles.dirs) {
      await ensureDir(path.join(process.cwd(), dir));
    }
    for (const file of coreDirAndFiles.files) {
      await ensureFile(path.join(process.cwd(), file));
    }
    return { success: true };
  } catch (error) {
    console.error("Error ensuring core dirs and files:", error);
    return { success: false, error: "Failed to ensure core dirs and files" };
  }
};

export const ensureDir = async (dir: string) => {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
};

export const ensureFile = async (filePath: string) => {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, "", "utf-8");
  }
};

export const readJsonFile = async (filePath: string): Promise<any> => {
  try {
    const content = await fs.readFile(
      path.join(process.cwd(), filePath),
      "utf-8"
    );
    return JSON.parse(content) || {};
  } catch (error) {
    return null;
  }
};

export const writeJsonFile = async (
  data: any,
  filePath: string
): Promise<void> => {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(
      path.join(process.cwd(), filePath),
      JSON.stringify(data, null, 2),
      "utf-8"
    );
  } catch (error) {
    console.error("Error writing data:", error);
    throw error;
  }
};

export const readFile = async (filePath: string): Promise<string> => {
  try {
    const content = await fs.readFile(
      path.join(process.cwd(), filePath),
      "utf-8"
    );
    return content || "";
  } catch (error) {
    return "";
  }
};

export const getUserModeDir = async (
  mode: Modes,
  username?: string
): Promise<string> => {
  if (username) {
    return path.join(process.cwd(), DATA_DIR, mode, username);
  }

  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return path.join(process.cwd(), DATA_DIR, mode, user.username || "");
};

/**
 * @todo figure this out eventually, but for now it's too messy and I want this pull request to go through
 * Basically from client compoennt process.cwd is not available so I have added it to the previou functions.
 * From this comment on it's passed in via filePath/dirPath as these are ONLY called from server components.
 */

export const serverReadFile = async (
  filePath: string,
  customReturn?: any
): Promise<string> => {
  try {
    return (await fs.readFile(filePath, "utf-8")) || "";
  } catch (error) {
    return customReturn || "";
  }
};

export const serverWriteFile = async (filePath: string, content: string) => {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf-8");
};

export const serverDeleteFile = async (filePath: string) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore if file doesn't exist
  }
};

export const serverReadDir = async (dirPath: string) => {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    return [];
  }
};

export const serverDeleteDir = async (dirPath: string) => {
  try {
    await fs.rm(dirPath, { recursive: true });
  } catch (error) {
    // Ignore if directory doesn't exist
  }
};

export const readOrderFile = async (
  dirPath: string
): Promise<OrderData | null> => {
  try {
    const filePath = path.join(dirPath, ".order.json");
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content) as OrderData;
    const categories = Array.isArray(data.categories)
      ? data.categories
      : undefined;
    const items = Array.isArray(data.items) ? data.items : undefined;
    return { categories, items };
  } catch {
    return null;
  }
};

export const writeOrderFile = async (
  dirPath: string,
  data: OrderData
): Promise<{ success: boolean }> => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    const filePath = path.join(dirPath, ".order.json");
    const toWrite: OrderData = {};
    if (data.categories && data.categories.length > 0) {
      toWrite.categories = data.categories;
    }
    if (data.items && data.items.length > 0) {
      toWrite.items = data.items;
    }
    await fs.writeFile(filePath, JSON.stringify(toWrite, null, 2), "utf-8");
    return { success: true };
  } catch {
    return { success: false };
  }
};
