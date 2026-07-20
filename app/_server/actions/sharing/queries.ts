"use server";

import { ItemTypes } from "@/app/_types/enums";
import { readShareFile } from "./io";
import { SharedItemEntry } from "./types";
import { SharedItemSummary } from "@/app/_types/sharing";

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

const _summaries = (
  sharing: Record<string, SharedItemEntry[]>
): SharedItemSummary[] => {
  const items: SharedItemSummary[] = [];

  Object.values(sharing).forEach((userShares) => {
    userShares.forEach((entry) => {
      if (entry.uuid) {
        items.push({ uuid: entry.uuid });
      }
    });
  });

  return items;
};

const _publicOnes = (
  sharing: Record<string, SharedItemEntry[]>
): SharedItemSummary[] =>
  (sharing.public || []).reduce<SharedItemSummary[]>((acc, entry) => {
    if (entry.uuid) {
      acc.push({ uuid: entry.uuid });
    }
    return acc;
  }, []);

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

  const deduplicate = (items: SharedItemSummary[]) =>
    items.filter(
      (item, index, array) =>
        array.findIndex((i) => i.uuid === item.uuid) === index
    );

  return {
    notes: deduplicate(_summaries(notesSharing)),
    checklists: deduplicate(_summaries(checklistsSharing)),
    public: {
      notes: deduplicate(_publicOnes(notesSharing)),
      checklists: deduplicate(_publicOnes(checklistsSharing)),
    },
  };
};
