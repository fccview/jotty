"use server";

import path from "path";
import fs from "fs/promises";
import { Result } from "@/app/_types";
import { getCurrentUser } from "../users";
import { getListById } from "../checklist";
import { Metadata } from "next";
import { Modes } from "@/app/_types/enums";
import { getNoteById } from "../note";
import { getSettings } from "./settings";

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
