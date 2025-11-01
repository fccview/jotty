"use server";

import path from "path";
import fs from "fs/promises";
import { getUserModeDir } from "@/app/_server/actions/file";
import { Modes } from "@/app/_types/enums";
import { serverReadFile, serverWriteFile } from "@/app/_server/actions/file";
import { getNotes } from "@/app/_server/actions/note";
import { getLists } from "@/app/_server/actions/checklist";
import { encodeCategoryPath } from "@/app/_utils/global-utils";

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
  type: "note" | "checklist";
  path: string;
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

  const htmlRegex = /href="\/(note|checklist)\/([^"]+)"/g;
  let match;
  while ((match = htmlRegex.exec(content)) !== null) {
    const [, type, categoryPath] = match;
    const pathParts = categoryPath.split("/");
    const id = pathParts[pathParts.length - 1];
    const category = pathParts.slice(0, -1).join("/");

    links.push({
      type: type as "note" | "checklist",
      path: category ? `${category}/${id}` : id,
    });
  }

  const markdownRegex = /\[([^\]]+)\]\(\/(note|checklist)\/([^)]+)\)/g;
  while ((match = markdownRegex.exec(content)) !== null) {
    const [, , type, categoryPath] = match;
    const pathParts = categoryPath.split("/");
    const id = pathParts[pathParts.length - 1];
    const category = pathParts.slice(0, -1).join("/");

    links.push({
      type: type as "note" | "checklist",
      path: category ? `${category}/${id}` : id,
    });
  }

  const uniqueLinks = links.filter(
    (link, index, self) =>
      index ===
      self.findIndex((l) => l.type === link.type && l.path === link.path)
  );

  return uniqueLinks;
};

const resolveLinkPath = (
  linkPath: string,
  linkType: "note" | "checklist",
  index: LinkIndex
): string | null => {
  const targetKey = `${linkType}s`;

  if (index[targetKey][linkPath]) {
    return linkPath;
  }

  const uncategorizedPath = encodeCategoryPath(`Uncategorized/${decodeURIComponent(linkPath)}`);
  if (index[targetKey][uncategorizedPath]) {
    return uncategorizedPath;
  }

  return null;
};

export const updateIndexForItem = async (
  username: string,
  itemType: "note" | "checklist",
  itemId: string,
  currentLinks: LinkTarget[]
): Promise<void> => {
  const index = await readLinkIndex(username);

  const currentItemKey = `${itemType}s`;
  const currentItemLinks = index[currentItemKey][itemId] || {
    isLinkedTo: { notes: [], checklists: [] },
    isReferencedIn: { notes: [], checklists: [] },
  };

  for (const targetItemKey of currentItemLinks.isLinkedTo.notes) {
    if (index.notes[targetItemKey]) {
      index.notes[targetItemKey].isReferencedIn.notes = index.notes[
        targetItemKey
      ].isReferencedIn.notes.filter((ref) => ref !== itemId);
    }
  }

  for (const targetItemKey of currentItemLinks.isLinkedTo.checklists) {
    if (index.checklists[targetItemKey]) {
      index.checklists[targetItemKey].isReferencedIn.checklists =
        index.checklists[targetItemKey].isReferencedIn.checklists.filter(
          (ref) => ref !== itemId
        );
    }
  }

  const newOutgoingLinks = {
    notes: currentLinks.filter((l) => l.type === "note").map((l) => {
      const resolvedPath = resolveLinkPath(l.path, l.type, index);
      return resolvedPath || `Uncategorized/${l.path}`;
    }),
    checklists: currentLinks
      .filter((l) => l.type === "checklist")
      .map((l) => {
        const resolvedPath = resolveLinkPath(l.path, l.type, index);
        return resolvedPath || `Uncategorized/${l.path}`;
      }),
  };

  for (const link of currentLinks) {
    const resolvedPath = resolveLinkPath(link.path, link.type, index);
    const targetPath = resolvedPath ? (resolvedPath.includes("/") ? resolvedPath : `Uncategorized/${resolvedPath}`) : link.path;
    const targetKey = `${link.type}s`;
    if (!index[targetKey][targetPath]) {
      index[targetKey][targetPath] = {
        isLinkedTo: { notes: [], checklists: [] },
        isReferencedIn: { notes: [], checklists: [] },
      };
    }
    if (
      !index[targetKey][targetPath].isReferencedIn[
        itemType === "note" ? "notes" : "checklists"
      ].includes(itemId)
    ) {
      index[targetKey][targetPath].isReferencedIn[
        itemType === "note" ? "notes" : "checklists"
      ].push(itemId);
    }
  }

  currentItemLinks.isLinkedTo = newOutgoingLinks;
  index[currentItemKey][itemId] = currentItemLinks;

  await writeLinkIndex(username, index);
};

export const removeItemFromIndex = async (
  username: string,
  itemType: "note" | "checklist",
  itemId: string
): Promise<void> => {
  const index = await readLinkIndex(username);
  const itemKey = `${itemType}s`;

  if (!index[itemKey][itemId]) return;

  const itemLinks = index[itemKey][itemId];

  for (const linkedItem of itemLinks.isLinkedTo.notes) {
    if (index.notes[linkedItem]) {
      index.notes[linkedItem].isReferencedIn[
        itemType === "note" ? "notes" : "checklists"
      ] = index.notes[linkedItem].isReferencedIn[
        itemType === "note" ? "notes" : "checklists"
      ].filter((ref) => ref !== itemId);
    }
  }

  for (const linkedItem of itemLinks.isLinkedTo.checklists) {
    if (index.checklists[linkedItem]) {
      index.checklists[linkedItem].isReferencedIn[
        itemType === "note" ? "notes" : "checklists"
      ] = index.checklists[linkedItem].isReferencedIn[
        itemType === "note" ? "notes" : "checklists"
      ].filter((ref) => ref !== itemId);
    }
  }

  for (const referencingItem of itemLinks.isReferencedIn.notes) {
    if (index.notes[referencingItem]) {
      index.notes[referencingItem].isLinkedTo[
        itemType === "note" ? "notes" : "checklists"
      ] = index.notes[referencingItem].isLinkedTo[
        itemType === "note" ? "notes" : "checklists"
      ].filter((link) => link !== itemId);
    }
  }

  for (const referencingItem of itemLinks.isReferencedIn.checklists) {
    if (index.checklists[referencingItem]) {
      index.checklists[referencingItem].isLinkedTo[
        itemType === "note" ? "notes" : "checklists"
      ] = index.checklists[referencingItem].isLinkedTo[
        itemType === "note" ? "notes" : "checklists"
      ].filter((link) => link !== itemId);
    }
  }

  delete index[itemKey][itemId];

  await writeLinkIndex(username, index);
};

export const updateItemCategory = async (
  username: string,
  itemType: "note" | "checklist",
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
    getNotes(username),
    getLists(username),
  ]);

  const allNotes = notesResult.success ? notesResult.data || [] : [];
  const allChecklists = checklistsResult.success
    ? checklistsResult.data || []
    : [];

  const newIndex: LinkIndex = { notes: {}, checklists: {} };

  for (const note of allNotes) {
    const category = note.category && note.category !== "" && note.category !== "/" ? note.category : "Uncategorized";
    const itemKey = encodeCategoryPath(`${category}/${note.id}`);
    newIndex.notes[itemKey] = {
      isLinkedTo: { notes: [], checklists: [] },
      isReferencedIn: { notes: [], checklists: [] },
    };
  }

  for (const checklist of allChecklists) {
    const category = checklist.category && checklist.category !== "" && checklist.category !== "/" ? checklist.category : "Uncategorized";
    const itemKey = encodeCategoryPath(`${category}/${checklist.id}`);
    newIndex.checklists[itemKey] = {
      isLinkedTo: { notes: [], checklists: [] },
      isReferencedIn: { notes: [], checklists: [] },
    };
  }

  for (const note of allNotes) {
    const category = note.category && note.category !== "" && note.category !== "/" ? note.category : "Uncategorized";
    const itemKey = encodeCategoryPath(`${category}/${note.id}`);
    const links = parseInternalLinks(note.content);
    newIndex.notes[itemKey].isLinkedTo = {
      notes: links.filter((l) => l.type === "note").map((l) => {
        const resolvedPath = resolveLinkPath(l.path, l.type as "note" | "checklist", newIndex);
        return resolvedPath || encodeCategoryPath(`Uncategorized/${decodeURIComponent(l.path)}`);
      }),
      checklists: links
        .filter((l) => l.type === "checklist")
        .map((l) => {
          const resolvedPath = resolveLinkPath(l.path, l.type as "note" | "checklist", newIndex);
          return resolvedPath || encodeCategoryPath(`Uncategorized/${decodeURIComponent(l.path)}`);
        }),
    };
  }

  for (const checklist of allChecklists) {
    const category = checklist.category && checklist.category !== "" && checklist.category !== "/" ? checklist.category : "Uncategorized";
    const itemKey = encodeCategoryPath(`${category}/${checklist.id}`);
    const content = checklist.items.map((i) => i.text).join("\n");
    const links = parseInternalLinks(content);
    newIndex.checklists[itemKey].isLinkedTo = {
      notes: links.filter((l) => l.type === "note").map((l) => {
        const resolvedPath = resolveLinkPath(l.path, l.type as "note" | "checklist", newIndex);
        return resolvedPath || encodeCategoryPath(`Uncategorized/${decodeURIComponent(l.path)}`);
      }),
      checklists: links
        .filter((l) => l.type === "checklist")
        .map((l) => {
          const resolvedPath = resolveLinkPath(l.path, l.type as "note" | "checklist", newIndex);
          return resolvedPath || encodeCategoryPath(`Uncategorized/${decodeURIComponent(l.path)}`);
        }),
    };
  }

  for (const [itemType, items] of Object.entries(newIndex)) {
    for (const [itemId, itemLinks] of Object.entries({ ...items })) {
      if (!itemId.includes("/")) {
        const newKey = `Uncategorized/${itemId}`;
        newIndex[itemType][newKey] = itemLinks;
        delete newIndex[itemType][itemId];
      }
    }
  }

  for (const [itemType, items] of Object.entries(newIndex)) {
    for (const [itemId, itemLinks] of Object.entries(items)) {
      for (const link of [
        ...itemLinks.isLinkedTo.notes.map((path) => ({ type: "note", path })),
        ...itemLinks.isLinkedTo.checklists.map((path) => ({
          type: "checklist",
          path,
        })),
      ]) {
        const resolvedPath = resolveLinkPath(link.path, link.type as "note" | "checklist", newIndex);
        if (resolvedPath) {
          const targetKey = `${link.type}s`;
          const finalResolvedPath = resolvedPath.includes("/") ? resolvedPath : `Uncategorized/${resolvedPath}`;
          newIndex[targetKey][finalResolvedPath].isReferencedIn[
            itemType === "notes" ? "notes" : "checklists"
          ].push(itemId);
        }
      }
    }
  }

  await writeLinkIndex(username, newIndex);
};
