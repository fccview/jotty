"use server";

import path from "path";
import { getUserModeDir } from "@/app/_server/actions/file";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { serverReadFile, serverWriteFile } from "@/app/_server/actions/file";
import { getUserNotes } from "@/app/_server/actions/note";
import { getUserChecklists } from "@/app/_server/actions/checklist";
import { ItemType } from "@/app/_types";

export interface LinkIndex {
  notes: Record<string, ItemLinks>;
  checklists: Record<string, ItemLinks>;
  [key: string]: Record<string, ItemLinks>;
}

export interface ItemLinks {
  isLinkedTo: {
    notes: string[];
    checklists: string[];
  };
  isReferencedIn: {
    notes: string[];
    checklists: string[];
  };
}

export interface LinkTarget {
  type: ItemType;
  uuid: string;
}

const INDEX_FILENAME = ".index.json";

const getIndexFilePath = async (username: string): Promise<string> => {
  const userDir = await getUserModeDir(Modes.NOTES, username);
  return path.join(userDir, INDEX_FILENAME);
};

export const readLinkIndex = async (username: string): Promise<LinkIndex> => {
  try {
    const indexPath = await getIndexFilePath(username);
    const content = await serverReadFile(indexPath);
    return JSON.parse(content) as LinkIndex;
  } catch {
    return { notes: {}, checklists: {} };
  }
};

export const writeLinkIndex = async (
  username: string,
  index: LinkIndex
): Promise<void> => {
  const indexPath = await getIndexFilePath(username);
  await serverWriteFile(indexPath, JSON.stringify(index, null, 2));
};

export const parseInternalLinks = (content: string): LinkTarget[] => {
  const links: LinkTarget[] = [];

  const htmlRegex = /data-href="([^"]+)"[^>]*data-type="(note|checklist)"/g;
  let match;
  while ((match = htmlRegex.exec(content)) !== null) {
    const href = match[1];
    const type = match[2] as ItemType;

    if (href?.startsWith("/jotty/")) {
      const uuid = href.replace("/jotty/", "");
      links.push({
        type: type || ItemTypes.NOTE,
        uuid,
      });
    } else if (href && !href.includes("/")) {
      links.push({
        type,
        uuid: href,
      });
    }
  }

  if (links.length === 0) {
    const markdownRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    while ((match = markdownRegex.exec(content)) !== null) {
      const href = match[2];

      if (href?.startsWith("/jotty/")) {
        const uuid = href.replace("/jotty/", "");
        links.push({
          type: ItemTypes.NOTE,
          uuid,
        });
      }
    }
  }

  const uniqueLinks = links.filter(
    (link, index, self) =>
      index ===
      self.findIndex((l) => l.type === link.type && l.uuid === link.uuid)
  );

  return uniqueLinks;
};

export const updateIndexForItem = async (
  username: string,
  itemType: ItemType,
  itemUuid: string,
  currentLinks: LinkTarget[]
): Promise<void> => {
  if (!Array.isArray(currentLinks)) {
    currentLinks = [];
  }

  const index = await readLinkIndex(username);

  const currentItemKey = `${itemType}s`;
  const currentItemLinks = index[currentItemKey][itemUuid] || {
    isLinkedTo: { notes: [], checklists: [] },
    isReferencedIn: { notes: [], checklists: [] },
  };

  for (const targetUuid of currentItemLinks.isLinkedTo.notes) {
    if (index.notes[targetUuid]) {
      index.notes[targetUuid].isReferencedIn[currentItemKey] = index.notes[
        targetUuid
      ].isReferencedIn[currentItemKey].filter((ref) => ref !== itemUuid);
    }
  }

  for (const targetUuid of currentItemLinks.isLinkedTo.checklists) {
    if (index.checklists[targetUuid]) {
      index.checklists[targetUuid].isReferencedIn[currentItemKey] = index.checklists[
        targetUuid
      ].isReferencedIn[currentItemKey].filter((ref) => ref !== itemUuid);
    }
  }

  index[currentItemKey][itemUuid] = {
    isLinkedTo: { notes: [], checklists: [] },
    isReferencedIn: { notes: [], checklists: [] },
  };

  for (const link of currentLinks) {
    const targetKey = `${link.type}s`;

    if (!(index[currentItemKey][itemUuid].isLinkedTo as any)[targetKey]) {
      (index[currentItemKey][itemUuid].isLinkedTo as any)[targetKey] = [];
    }
    if (
      !(index[currentItemKey][itemUuid].isLinkedTo as any)[targetKey].includes(
        link.uuid
      )
    ) {
      (index[currentItemKey][itemUuid].isLinkedTo as any)[targetKey].push(
        link.uuid
      );
    }

    if (!index[targetKey][link.uuid]) {
      index[targetKey][link.uuid] = {
        isLinkedTo: { notes: [], checklists: [] },
        isReferencedIn: { notes: [], checklists: [] },
      };
    }
    if (!(index[targetKey][link.uuid].isReferencedIn as any)[currentItemKey]) {
      (index[targetKey][link.uuid].isReferencedIn as any)[currentItemKey] = [];
    }
    if (
      !(index[targetKey][link.uuid].isReferencedIn as any)[
        currentItemKey
      ].includes(itemUuid)
    ) {
      (index[targetKey][link.uuid].isReferencedIn as any)[currentItemKey].push(
        itemUuid
      );
    }
  }

  await writeLinkIndex(username, index);
};

export const removeItemFromIndex = async (
  username: string,
  itemType: ItemType,
  itemUuid: string
): Promise<void> => {
  const index = await readLinkIndex(username);
  const itemKey = `${itemType}s`;

  if (!index[itemKey][itemUuid]) return;

  const itemLinks = index[itemKey][itemUuid];

  for (const linkedItem of itemLinks.isLinkedTo.notes) {
    if (index.notes[linkedItem]) {
      index.notes[linkedItem].isReferencedIn[
        itemType === ItemTypes.NOTE ? Modes.NOTES : Modes.CHECKLISTS
      ] = index.notes[linkedItem].isReferencedIn[
        itemType === ItemTypes.NOTE ? Modes.NOTES : Modes.CHECKLISTS
      ].filter((ref) => ref !== itemUuid);
    }
  }

  for (const linkedItem of itemLinks.isLinkedTo.checklists) {
    if (index.checklists[linkedItem]) {
      index.checklists[linkedItem].isReferencedIn[
        itemType === ItemTypes.NOTE ? Modes.NOTES : Modes.CHECKLISTS
      ] = index.checklists[linkedItem].isReferencedIn[
        itemType === ItemTypes.NOTE ? Modes.NOTES : Modes.CHECKLISTS
      ].filter((ref) => ref !== itemUuid);
    }
  }

  for (const referencingItem of itemLinks.isReferencedIn.notes) {
    if (index.notes[referencingItem]) {
      index.notes[referencingItem].isLinkedTo[
        itemType === ItemTypes.NOTE ? Modes.NOTES : Modes.CHECKLISTS
      ] = index.notes[referencingItem].isLinkedTo[
        itemType === ItemTypes.NOTE ? Modes.NOTES : Modes.CHECKLISTS
      ].filter((link) => link !== itemUuid);
    }
  }

  for (const referencingItem of itemLinks.isReferencedIn.checklists) {
    if (index.checklists[referencingItem]) {
      index.checklists[referencingItem].isLinkedTo[
        itemType === ItemTypes.NOTE ? Modes.NOTES : Modes.CHECKLISTS
      ] = index.checklists[referencingItem].isLinkedTo[
        itemType === ItemTypes.NOTE ? Modes.NOTES : Modes.CHECKLISTS
      ].filter((link) => link !== itemUuid);
    }
  }

  delete index[itemKey][itemUuid];

  await writeLinkIndex(username, index);
};

export const updateItemCategory = async (
  username: string,
  itemType: ItemType,
  oldItemId: string,
  newItemId: string
): Promise<void> => {
  const index = await readLinkIndex(username);
  const itemKey = `${itemType}s`;

  if (oldItemId === newItemId) return;

  const oldItemData = index[itemKey][oldItemId];
  if (!oldItemData) return;

  index[itemKey][newItemId] = oldItemData;
  delete index[itemKey][oldItemId];

  for (const referencingNoteId of oldItemData.isReferencedIn.notes) {
    if (index.notes[referencingNoteId]) {
      index.notes[referencingNoteId].isLinkedTo.notes = index.notes[
        referencingNoteId
      ].isLinkedTo.notes.map((link) => (link === oldItemId ? newItemId : link));
    }
  }

  for (const referencingChecklistId of oldItemData.isReferencedIn.checklists) {
    if (index.checklists[referencingChecklistId]) {
      index.checklists[referencingChecklistId].isLinkedTo.notes =
        index.checklists[referencingChecklistId].isLinkedTo.notes.map((link) =>
          link === oldItemId ? newItemId : link
        );
    }
  }

  index[itemKey][newItemId].isReferencedIn = oldItemData.isReferencedIn;

  await writeLinkIndex(username, index);
};


export const rebuildLinkIndex = async (username: string): Promise<void> => {
  const [notesResult, checklistsResult] = await Promise.all([
    getUserNotes({ username }),
    getUserChecklists({ username }),
  ]);

  const allNotes = notesResult.success ? notesResult.data || [] : [];
  const allChecklists = checklistsResult.success
    ? checklistsResult.data || []
    : [];

  const newIndex: LinkIndex = { notes: {}, checklists: {} };

  for (const note of allNotes) {
    if (note.uuid) {
      newIndex.notes[note.uuid] = {
        isLinkedTo: { notes: [], checklists: [] },
        isReferencedIn: { notes: [], checklists: [] },
      };
    }
  }

  for (const checklist of allChecklists) {
    if (checklist.uuid) {
      newIndex.checklists[checklist.uuid] = {
        isLinkedTo: { notes: [], checklists: [] },
        isReferencedIn: { notes: [], checklists: [] },
      };
    }
  }

  for (const note of allNotes) {
    if (!note.uuid) continue;
    const links = parseInternalLinks(note.content || "");
    newIndex.notes[note.uuid].isLinkedTo = {
      notes: links.filter((l) => l.type === ItemTypes.NOTE).map((l) => l.uuid),
      checklists: links
        .filter((l) => l.type === ItemTypes.CHECKLIST)
        .map((l) => l.uuid),
    };
  }

  for (const checklist of allChecklists) {
    if (!checklist.uuid) continue;
    const content = checklist?.items?.map((i) => i.text).join("\n") || "";
    const links = parseInternalLinks(content);
    newIndex.checklists[checklist.uuid].isLinkedTo = {
      notes: links.filter((l) => l.type === ItemTypes.NOTE).map((l) => l.uuid),
      checklists: links
        .filter((l) => l.type === ItemTypes.CHECKLIST)
        .map((l) => l.uuid),
    };
  }

  for (const [sourceType, items] of Object.entries(newIndex)) {
    for (const [sourceUuid, itemLinks] of Object.entries(items)) {
      for (const targetUuid of itemLinks.isLinkedTo.notes) {
        if (newIndex.notes[targetUuid]) {
          const refType = sourceType === "notes" ? "notes" : "checklists";
          if (
            !newIndex.notes[targetUuid].isReferencedIn[refType].includes(
              sourceUuid
            )
          ) {
            newIndex.notes[targetUuid].isReferencedIn[refType].push(sourceUuid);
          }
        }
      }

      for (const targetUuid of itemLinks.isLinkedTo.checklists) {
        if (newIndex.checklists[targetUuid]) {
          const refType = sourceType === "notes" ? "notes" : "checklists";
          if (
            !newIndex.checklists[targetUuid].isReferencedIn[refType].includes(
              sourceUuid
            )
          ) {
            newIndex.checklists[targetUuid].isReferencedIn[refType].push(
              sourceUuid
            );
          }
        }
      }
    }
  }

  await writeLinkIndex(username, newIndex);
};
