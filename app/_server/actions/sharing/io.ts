"use server";

import path from "path";
import { ItemType } from "@/app/_types/core";
import { ensureDir, readJsonFile, writeJsonFile } from "@/app/_server/actions/file";
import { ItemTypes } from "@/app/_types/enums";
import { getSharingFilePath } from "./helpers";
import { SharingData } from "./types";

export const readShareFile = async (
  itemType: ItemType | "all"
): Promise<SharingData> => {
  if (itemType === "all") {
    const noteSharingData = await readShareFile(ItemTypes.NOTE);
    const checklistSharingData = await readShareFile(ItemTypes.CHECKLIST);
    return {
      notes: noteSharingData,
      checklists: checklistSharingData,
    } as any;
  } else {
    const filePath = await getSharingFilePath(itemType);
    await ensureDir(path.dirname(filePath));

    const content = await readJsonFile(filePath);
    return content || {};
  }
};

export const writeShareFile = async (
  itemType: ItemType,
  data: SharingData
): Promise<void> => {
  const filePath = await getSharingFilePath(itemType);
  await writeJsonFile(data, filePath);
};
