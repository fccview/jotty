"use server";

import path from "path";
import fs from "fs/promises";
import { Result } from "@/app/_types";
import { getCurrentUser } from "../users";
import { getListById } from "../checklist/queries";
import { Metadata } from "next";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { canReach, isPublicItem } from "../share/queries";
import { getNoteById } from "../note/queries";
import { getSettings } from "./settings";

export const getMedatadaTitle = async (
  appMode: Modes,
  uuid: string
): Promise<Metadata> => {
  const user = await getCurrentUser();
  const settings = await getSettings();
  const defaultTitle = appMode === Modes.CHECKLISTS ? "Checklist" : "Note";

  const ogName = settings?.isRwMarkable ? "rwMarkable" : "jotty·page";
  const appName = settings?.appName || ogName;

  const itemType = appMode === Modes.CHECKLISTS ? ItemTypes.CHECKLIST : ItemTypes.NOTE;
  const visible =
    (await isPublicItem(uuid, itemType)) ||
    (!!user?.username &&
      (await canReach(uuid, itemType, user.username, PermissionTypes.READ)));

  const item = !visible
    ? null
    : appMode === Modes.CHECKLISTS
      ? await getListById(uuid)
      : await getNoteById(uuid);

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
