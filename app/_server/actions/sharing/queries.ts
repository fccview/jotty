"use server";

import { ItemTypes } from "@/app/_types/enums";
import { readShareFile } from "./io";
import { SharedItemEntry } from "./types";

export const getAllSharedItemsForUser = async (
  username: string
): Promise<{ notes: SharedItemEntry[]; checklists: SharedItemEntry[] }> => {
  const notesSharing = await readShareFile(ItemTypes.NOTE);
  const checklistsSharing = await readShareFile(ItemTypes.CHECKLIST);

  return {
    notes: notesSharing[username] || [],
    checklists: checklistsSharing[username] || [],
  };
};

export const getUsersWithAccess = async (
  checklistUuid: string
): Promise<string[]> => {
  const sharingData = await readShareFile(ItemTypes.CHECKLIST);
  const users: string[] = [];

  for (const [username, entries] of Object.entries(sharingData)) {
    if (username === "public") continue;
    if (entries.some((entry) => entry.uuid === checklistUuid)) {
      users.push(username);
    }
  }

  return users;
};

interface SharedItemSummary {
  uuid: string;
  sharer: string;
}

export const getAllSharedItems = async (): Promise<{
  notes: SharedItemSummary[];
  checklists: SharedItemSummary[];
  public: {
    notes: SharedItemSummary[];
    checklists: SharedItemSummary[];
  };
}> => {
  const [notesSharing, checklistsSharing] = await Promise.all([
    readShareFile(ItemTypes.NOTE),
    readShareFile(ItemTypes.CHECKLIST),
  ]);

  const allNotes: SharedItemSummary[] = [];
  const allChecklists: SharedItemSummary[] = [];
  const publicNotes: SharedItemSummary[] = [];
  const publicChecklists: SharedItemSummary[] = [];

  for (const [username, userShares] of Object.entries(notesSharing)) {
    if (username === "public") continue;
    for (const entry of userShares) {
      if (entry.uuid) {
        allNotes.push({ uuid: entry.uuid, sharer: entry.sharer });
      }
    }
  }

  for (const [username, userShares] of Object.entries(checklistsSharing)) {
    if (username === "public") continue;
    for (const entry of userShares) {
      if (entry.uuid) {
        allChecklists.push({ uuid: entry.uuid, sharer: entry.sharer });
      }
    }
  }

  if (notesSharing.public) {
    for (const entry of notesSharing.public) {
      if (entry.uuid) {
        publicNotes.push({ uuid: entry.uuid, sharer: entry.sharer });
      }
    }
  }

  if (checklistsSharing.public) {
    for (const entry of checklistsSharing.public) {
      if (entry.uuid) {
        publicChecklists.push({ uuid: entry.uuid, sharer: entry.sharer });
      }
    }
  }

  const _deduplicate = (items: SharedItemSummary[]) =>
    items.filter(
      (item, index, array) =>
        array.findIndex(
          (i) => i.uuid === item.uuid && i.sharer === item.sharer
        ) === index
    );

  return {
    notes: _deduplicate(allNotes),
    checklists: _deduplicate(allChecklists),
    public: {
      notes: _deduplicate(publicNotes),
      checklists: _deduplicate(publicChecklists),
    },
  };
};
