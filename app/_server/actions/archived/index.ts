"use server";

import { Checklist, Note, ItemType } from "@/app/_types";
import { getLists } from "@/app/_server/actions/checklist";
import { getNotes } from "@/app/_server/actions/note";
import { ARCHIVED_DIR_NAME } from "@/app/_consts/files";
import { getCurrentUser } from "@/app/_server/actions/users";
import { ItemTypes } from "@/app/_types/enums";

export interface ArchivedItem {
  id: string;
  title: string;
  type: ItemType;
  category: string;
  updatedAt: string;
  owner?: string;
  isShared?: boolean;
  data: Checklist | Note;
}

export const getArchivedItems = async () => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    const archivedItems: ArchivedItem[] = [];

    const listsResult = await getLists(currentUser.username, true);
    if (listsResult.success && listsResult.data) {
      const archivedLists = listsResult.data.filter(
        (list) => list.category === ARCHIVED_DIR_NAME
      );
      archivedItems.push(
        ...archivedLists.map((list) => ({
          id: list.id,
          title: list.title,
          type: ItemTypes.CHECKLIST,
          category: list.category || ARCHIVED_DIR_NAME,
          updatedAt: list.updatedAt,
          owner: list.owner,
          isShared: list.isShared,
          data: list,
        }))
      );
    }

    const notesResult = await getNotes(currentUser.username, true);
    if (notesResult.success && notesResult.data) {
      const archivedNotes = notesResult.data.filter(
        (note) => note.category === ARCHIVED_DIR_NAME
      );
      archivedItems.push(
        ...archivedNotes.map((note) => ({
          id: note.id,
          title: note.title,
          type: "note" as ItemType,
          category: note.category || ARCHIVED_DIR_NAME,
          updatedAt: note.updatedAt,
          owner: note.owner,
          isShared: note.isShared,
          data: note,
        }))
      );
    }

    archivedItems.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return { success: true, data: archivedItems };
  } catch (error) {
    console.error("Error fetching archived items:", error);
    return { success: false, error: "Failed to fetch archived items" };
  }
};
