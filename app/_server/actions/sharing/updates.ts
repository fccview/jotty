"use server";

import { ItemType } from "@/app/_types/core";
import { readShareFile, writeShareFile } from "./io";
import { SharingItemUpdate } from "./types";

export const updateSharingData = async (
  previousItem: SharingItemUpdate,
  newItem: SharingItemUpdate | null
): Promise<void> => {
  const sharingData = await readShareFile(previousItem.itemType);
  let hasChanges = false;

  if (newItem === null) {
    Object.keys(sharingData).forEach((username) => {
      const originalLength = sharingData[username].length;
      sharingData[username] = sharingData[username].filter(
        (entry) => !(previousItem.uuid && entry.uuid === previousItem.uuid)
      );
      if (sharingData[username].length !== originalLength) {
        hasChanges = true;
      }
      if (sharingData[username].length === 0) {
        delete sharingData[username];
      }
    });
  } else if (newItem.sharer && newItem.sharer !== previousItem.sharer) {
    Object.keys(sharingData).forEach((username) => {
      sharingData[username].forEach((entry) => {
        const matches = previousItem.uuid
          ? entry.uuid === previousItem.uuid
          : entry.sharer === previousItem.sharer;

        if (matches && entry.sharer === previousItem.sharer) {
          entry.sharer = newItem.sharer!;
          hasChanges = true;
        }
      });
    });
  }

  if (hasChanges) {
    await writeShareFile(previousItem.itemType, sharingData);
  }
};

export const updateReceiverUsername = async (
  oldUsername: string,
  newUsername: string,
  itemType: ItemType
): Promise<void> => {
  const sharingData = await readShareFile(itemType);

  if (sharingData[oldUsername]) {
    sharingData[newUsername] = sharingData[oldUsername];
    delete sharingData[oldUsername];

    await writeShareFile(itemType, sharingData);
  }
};
