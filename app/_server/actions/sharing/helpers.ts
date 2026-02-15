"use server";

import path from "path";
import fs from "fs/promises";
import { ItemType } from "@/app/_types/core";
import { extractUuid } from "@/app/_utils/yaml-metadata-utils";
import { DATA_DIR } from "@/app/_consts/files";
import { ItemTypes, Modes } from "@/app/_types/enums";

export const getItemUuid = async (
  user: string,
  itemType: "note" | "checklist",
  itemId: string,
  category: string
): Promise<string | undefined> => {
  try {
    const dataDir = path.join(process.cwd(), "data");
    const modeDir = itemType === "checklist" ? "checklists" : "notes";
    const userDir = path.join(dataDir, modeDir, user);
    const categoryDir = path.join(userDir, category || "Uncategorized");
    const filePath = path.join(categoryDir, `${itemId}.md`);

    const content = await fs.readFile(filePath, "utf-8");
    return extractUuid(content);
  } catch (error) {
    console.warn(`Could not get UUID for item ${itemId}:`, error);
    return undefined;
  }
};

export const getSharingFilePath = async (itemType: ItemType): Promise<string> => {
  const folderName =
    itemType === ItemTypes.CHECKLIST ? Modes.CHECKLISTS : Modes.NOTES;
  return path.join(DATA_DIR, folderName, ".sharing.json");
};
