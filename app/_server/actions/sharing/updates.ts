"use server";

import { ItemType } from "@/app/_types/core";
import { encodeCategoryPath } from "@/app/_utils/global-utils";
import { readShareFile, writeShareFile } from "./io";
import { SharingItemUpdate } from "./types";

export const updateSharingData = async (
  previousItem: SharingItemUpdate,
  newItem: SharingItemUpdate | null
): Promise<void> => {
  const sharingData = await readShareFile(previousItem.itemType);
  let hasChanges = false;

  if (newItem === null) {
    const encodedCategory = encodeCategoryPath(
      previousItem.category || "Uncategorized"
    );
    Object.keys(sharingData).forEach((username) => {
      const originalLength = sharingData[username].length;
      sharingData[username] = sharingData[username].filter(
        (entry) =>
          !(
            (previousItem.uuid && entry.uuid === previousItem.uuid) ||
            (entry.id === previousItem.id &&
              (!entry.category || entry.category === encodedCategory))
          )
      );
      if (sharingData[username].length !== originalLength) {
        hasChanges = true;
      }
      if (sharingData[username].length === 0) {
        delete sharingData[username];
      }
    });
  } else {
    const prevCategory = previousItem.category
      ? encodeCategoryPath(previousItem.category)
      : null;
    const newCategory = newItem.category
      ? encodeCategoryPath(newItem.category)
      : null;

    Object.keys(sharingData).forEach((username) => {
      sharingData[username].forEach((entry) => {
        let updated = false;

        if (
          !previousItem.id &&
          newItem.sharer &&
          entry.sharer === previousItem.sharer
        ) {
          entry.sharer = newItem.sharer;
          updated = true;
        } else if (previousItem.id) {
          if (
            entry.id === previousItem.id &&
            entry.category ===
            (prevCategory || encodeCategoryPath("Uncategorized")) &&
            newItem.id !== previousItem.id
          ) {
            entry.id = newItem.id;
            updated = true;
          }

          if (
            entry.id === (newItem.id || previousItem.id) &&
            entry.category ===
            (prevCategory || encodeCategoryPath("Uncategorized")) &&
            newCategory &&
            newCategory !==
            (prevCategory || encodeCategoryPath("Uncategorized"))
          ) {
            entry.category = newCategory;
            updated = true;
          }

          if (
            newItem.sharer &&
            entry.sharer === previousItem.sharer &&
            entry.id === (newItem.id || previousItem.id) &&
            entry.category ===
            (newCategory ||
              prevCategory ||
              encodeCategoryPath("Uncategorized")) &&
            newItem.sharer !== previousItem.sharer
          ) {
            entry.sharer = newItem.sharer;
            updated = true;
          }
        }

        if (updated) {
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
