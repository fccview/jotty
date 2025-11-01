"use server";

import { ItemType, Result } from "@/app/_types";
import {
  ensureDir,
  readJsonFile,
  writeJsonFile,
} from "@/app/_server/actions/file";
import { encodeCategoryPath } from "@/app/_utils/global-utils";
import path from "path";
import { DATA_DIR } from "@/app/_consts/files";
import { Modes } from "@/app/_types/enums";

interface SharedItemEntry {
  id: string;
  category: string;
  sharer: string;
}

interface SharingItemUpdate {
  id: string;
  category: string;
  itemType: ItemType;
  sharer?: string;
}

type SharingData = Record<string, SharedItemEntry[]>;

const getSharingFilePath = (itemType: ItemType): string => {
  const folderName = itemType === "checklist" ? Modes.CHECKLISTS : Modes.NOTES;
  return path.join(DATA_DIR, folderName, ".sharing.json");
};

export const readShareFile = async (
  itemType: ItemType | "all"
): Promise<SharingData> => {
  if (itemType === "all") {
    const noteSharingData = await readShareFile("note");
    const checklistSharingData = await readShareFile("checklist");
    return {
      notes: noteSharingData,
      checklists: checklistSharingData
    } as any;
  } else {
    const filePath = getSharingFilePath(itemType);
    await ensureDir(path.dirname(filePath));

    const content = await readJsonFile(filePath);
    return content || {};
  }
};

const writeShareFile = async (
  itemType: ItemType,
  data: SharingData
): Promise<void> => {
  const filePath = getSharingFilePath(itemType);
  await writeJsonFile(data, filePath);
};

export const shareWith = async (
  item: string,
  categoryPath: string,
  sharerUsername: string,
  receiverUsername: string,
  itemType: ItemType
): Promise<Result<null>> => {
  const sharingData = await readShareFile(itemType);

  const encodedCategory = encodeCategoryPath(categoryPath || "Uncategorized");

  const newEntry: SharedItemEntry = {
    id: item,
    category: encodedCategory,
    sharer: sharerUsername,
  };

  if (!sharingData[receiverUsername]) {
    sharingData[receiverUsername] = [];
  }

  sharingData[receiverUsername] = sharingData[receiverUsername].filter(
    (entry) => !(entry.id === item && entry.sharer === sharerUsername)
  );

  sharingData[receiverUsername].push(newEntry);

  try {
    await writeShareFile(itemType, sharingData);
  } catch (error) {
    return { success: false, error: "Failed to write share file" };
  }

  return { success: true, data: null };
};

export const isItemSharedWith = async (
  item: string,
  categoryPath: string,
  itemType: ItemType,
  username: string
): Promise<boolean> => {
  const sharingData = await readShareFile(itemType);
  const encodedCategory = encodeCategoryPath(categoryPath || "Uncategorized");

  const userShares = sharingData[username] || [];
  return userShares.some(
    (entry) => entry.id === item && entry.category === encodedCategory
  );
};

export const unshareWith = async (
  item: string,
  categoryPath: string,
  sharerUsername: string,
  receiverUsername: string,
  itemType: ItemType
): Promise<Result<null>> => {
  const sharingData = await readShareFile(itemType);
  const encodedCategory = encodeCategoryPath(categoryPath || "Uncategorized");

  console.log(item);

  if (sharingData[receiverUsername]) {
    sharingData[receiverUsername] = sharingData[receiverUsername].filter(
      (entry) =>
        !(
          entry.id === item &&
          entry.sharer === sharerUsername &&
          entry.category === encodedCategory
        )
    );

    if (sharingData[receiverUsername].length === 0) {
      delete sharingData[receiverUsername];
    }
  }
  try {
    await writeShareFile(itemType, sharingData);
  } catch (error) {
    return { success: false, error: "Failed to write unshare file" };
  }

  return { success: true };
};

export const getAllSharedItemsForUser = async (
  username: string
): Promise<{ notes: SharedItemEntry[]; checklists: SharedItemEntry[] }> => {
  const notesSharing = await readShareFile("note");
  const checklistsSharing = await readShareFile("checklist");

  return {
    notes: notesSharing[username] || [],
    checklists: checklistsSharing[username] || [],
  };
};

export const getAllSharedItems = async (): Promise<{
  notes: Array<{ id: string; category: string }>;
  checklists: Array<{ id: string; category: string }>;
  public: {
    notes: Array<{ id: string; category: string }>;
    checklists: Array<{ id: string; category: string }>;
  };
}> => {
  const [notesSharing, checklistsSharing] = await Promise.all([
    readShareFile("note"),
    readShareFile("checklist"),
  ]);

  const allNotes: Array<{ id: string; category: string }> = [];
  const allChecklists: Array<{ id: string; category: string }> = [];
  const publicNotes: Array<{ id: string; category: string }> = [];
  const publicChecklists: Array<{ id: string; category: string }> = [];

  Object.values(notesSharing).forEach((userShares) => {
    userShares.forEach((entry) => {
      allNotes.push({ id: entry.id, category: entry.category });
    });
  });

  Object.values(checklistsSharing).forEach((userShares) => {
    userShares.forEach((entry) => {
      allChecklists.push({ id: entry.id, category: entry.category });
    });
  });

  if (notesSharing.public) {
    notesSharing.public.forEach((entry) => {
      publicNotes.push({ id: entry.id, category: entry.category });
    });
  }

  if (checklistsSharing.public) {
    checklistsSharing.public.forEach((entry) => {
      publicChecklists.push({ id: entry.id, category: entry.category });
    });
  }

  const deduplicate = (items: Array<{ id: string; category: string }>) =>
    items.filter(
      (item, index, array) =>
        array.findIndex(
          (i) => i.id === item.id && i.category === item.category
        ) === index
    );

  return {
    notes: deduplicate(allNotes),
    checklists: deduplicate(allChecklists),
    public: {
      notes: deduplicate(publicNotes),
      checklists: deduplicate(publicChecklists),
    },
  };
};

export const updateSharingData = async (
  previousItem: SharingItemUpdate,
  newItem: SharingItemUpdate | null
): Promise<void> => {
  const sharingData = await readShareFile(previousItem.itemType);
  let hasChanges = false;

  if (newItem === null) {
    Object.keys(sharingData).forEach(username => {
      const originalLength = sharingData[username].length;
      sharingData[username] = sharingData[username].filter(
        entry =>
          !(entry.id === previousItem.id &&
            entry.category === encodeCategoryPath(previousItem.category || "Uncategorized"))
      );
      if (sharingData[username].length !== originalLength) {
        hasChanges = true;
      }
      if (sharingData[username].length === 0) {
        delete sharingData[username];
      }
    });
  } else {
    const prevCategory = previousItem.category ? encodeCategoryPath(previousItem.category) : null;
    const newCategory = newItem.category ? encodeCategoryPath(newItem.category) : null;

    Object.keys(sharingData).forEach(username => {
      sharingData[username].forEach(entry => {
        let updated = false;

        if (!previousItem.id && newItem.sharer && entry.sharer === previousItem.sharer) {
          entry.sharer = newItem.sharer;
          updated = true;
        }
        else if (previousItem.id) {
          if (entry.id === previousItem.id &&
            entry.category === (prevCategory || encodeCategoryPath("Uncategorized")) &&
            newItem.id !== previousItem.id) {
            entry.id = newItem.id;
            updated = true;
          }

          if (entry.id === (newItem.id || previousItem.id) &&
            entry.category === (prevCategory || encodeCategoryPath("Uncategorized")) &&
            newCategory && newCategory !== (prevCategory || encodeCategoryPath("Uncategorized"))) {
            entry.category = newCategory;
            updated = true;
          }

          if (newItem.sharer &&
            entry.sharer === previousItem.sharer &&
            entry.id === (newItem.id || previousItem.id) &&
            entry.category === (newCategory || prevCategory || encodeCategoryPath("Uncategorized")) &&
            newItem.sharer !== previousItem.sharer) {
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
