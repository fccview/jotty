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

export const getAllSharedItems = async (): Promise<{
  notes: Array<{ id: string; category: string }>;
  checklists: Array<{ id: string; category: string }>;
  public: {
    notes: Array<{ id: string; category: string }>;
    checklists: Array<{ id: string; category: string }>;
  };
}> => {
  const [notesSharing, checklistsSharing] = await Promise.all([
    readShareFile(ItemTypes.NOTE),
    readShareFile(ItemTypes.CHECKLIST),
  ]);

  const allNotes: Array<{ id: string; category: string }> = [];
  const allChecklists: Array<{ id: string; category: string }> = [];
  const publicNotes: Array<{ id: string; category: string }> = [];
  const publicChecklists: Array<{ id: string; category: string }> = [];

  Object.values(notesSharing).forEach((userShares) => {
    userShares.forEach((entry) => {
      if (entry.id && entry.category) {
        allNotes.push({ id: entry.id, category: entry.category });
      }
    });
  });

  Object.values(checklistsSharing).forEach((userShares) => {
    userShares.forEach((entry) => {
      if (entry.id && entry.category) {
        allChecklists.push({ id: entry.id, category: entry.category });
      }
    });
  });

  if (notesSharing.public) {
    for (const entry of notesSharing.public) {
      if (entry.id && entry.category) {
        publicNotes.push({ id: entry.id, category: entry.category });
      } else if (entry.uuid && entry.id) {
        const { getNoteById } = await import("@/app/_server/actions/note");
        const note = await getNoteById(entry.uuid);
        if (note) {
          publicNotes.push({
            id: note.id,
            category: note.category || "Uncategorized",
          });
        }
      }
    }
  }

  if (checklistsSharing.public) {
    for (const entry of checklistsSharing.public) {
      if (entry.id && entry.category) {
        publicChecklists.push({ id: entry.id, category: entry.category });
      } else if (entry.uuid && entry.id) {
        const { getListById } = await import("@/app/_server/actions/checklist");
        const checklist = await getListById(entry.uuid);
        if (checklist) {
          publicChecklists.push({
            id: checklist.id,
            category: checklist.category || "Uncategorized",
          });
        }
      }
    }
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
