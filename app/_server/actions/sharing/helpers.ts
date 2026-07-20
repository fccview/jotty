"use server";

import path from "path";
import { ItemType } from "@/app/_types/core";
import { DATA_DIR } from "@/app/_consts/files";
import { ItemTypes, Modes } from "@/app/_types/enums";

export const getSharingFilePath = async (
  itemType: ItemType,
): Promise<string> => {
  const folderName =
    itemType === ItemTypes.CHECKLIST ? Modes.CHECKLISTS : Modes.NOTES;
  return path.join(DATA_DIR, folderName, ".sharing.json");
};

export const hasSharedContentFrom = async (
  ownerUsername: string,
  viewerUsername: string,
): Promise<boolean> => {
  const { readShareFile } = await import("./io");
  const notesSharing = await readShareFile(ItemTypes.NOTE);
  const checklistsSharing = await readShareFile(ItemTypes.CHECKLIST);

  const noteShares = notesSharing[viewerUsername] || [];
  const checklistShares = checklistsSharing[viewerUsername] || [];

  return (
    noteShares.some((entry) => entry.sharer === ownerUsername) ||
    checklistShares.some((entry) => entry.sharer === ownerUsername)
  );
};
