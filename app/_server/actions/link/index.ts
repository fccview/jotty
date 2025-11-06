"use server";

import path from "path";
import fs from "fs/promises";
import { getUserModeDir } from "@/app/_server/actions/file";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { serverReadFile, serverWriteFile } from "@/app/_server/actions/file";
import { getNotes, getNoteById } from "@/app/_server/actions/note";
import { getLists, getListById } from "@/app/_server/actions/checklist";
import {
  encodeCategoryPath,
  decodeCategoryPath,
  encodeId,
  decodeId,
} from "@/app/_utils/global-utils";
import { ItemType } from "@/app/_types";
import { NOTES_FOLDER } from "@/app/_consts/notes";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";

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
      type: type as ItemType,
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
      type: type as ItemType,
      path: category ? `${encodeCategoryPath(category)}/${id}` : id,
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
  linkType: ItemType,
  index: LinkIndex
): string | null => {
  const targetKey = `${linkType}s`;

  if (index[targetKey][linkPath]) {
    return linkPath;
  }

  const uncategorizedPath = encodeCategoryPath(
    `Uncategorized/${decodeURIComponent(linkPath)}`
  );
  if (index[targetKey][uncategorizedPath]) {
    return uncategorizedPath;
  }

  return null;
};

export const updateIndexForItem = async (
  username: string,
  itemType: ItemType,
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
    notes: currentLinks
      .filter((l) => l.type === ItemTypes.NOTE)
      .map((l) => {
        const resolvedPath = resolveLinkPath(l.path, l.type, index);
        return resolvedPath || `Uncategorized/${l.path}`;
      }),
    checklists: currentLinks
      .filter((l) => l.type === ItemTypes.CHECKLIST)
      .map((l) => {
        const resolvedPath = resolveLinkPath(l.path, l.type, index);
        return resolvedPath || `Uncategorized/${l.path}`;
      }),
  };

  for (const link of currentLinks) {
    const resolvedPath = resolveLinkPath(link.path, link.type, index);
    const targetPath = resolvedPath
      ? resolvedPath.includes("/")
        ? resolvedPath
        : `Uncategorized/${resolvedPath}`
      : link.path;
    const targetKey = `${link.type}s`;
    if (!index[targetKey][targetPath]) {
      index[targetKey][targetPath] = {
        isLinkedTo: { notes: [], checklists: [] },
        isReferencedIn: { notes: [], checklists: [] },
      };
    }
    if (
      !index[targetKey][targetPath].isReferencedIn[
        itemType === ItemTypes.NOTE ? Modes.NOTES : Modes.CHECKLISTS
      ].includes(itemId)
    ) {
      index[targetKey][targetPath].isReferencedIn[
        itemType === ItemTypes.NOTE ? Modes.NOTES : Modes.CHECKLISTS
      ].push(itemId);
    }
  }

  currentItemLinks.isLinkedTo = newOutgoingLinks;
  index[currentItemKey][itemId] = currentItemLinks;

  await writeLinkIndex(username, index);
};

export const removeItemFromIndex = async (
  username: string,
  itemType: ItemType,
  itemId: string
): Promise<void> => {
  const index = await readLinkIndex(username);
  const itemKey = `${itemType}s`;

  if (!index[itemKey][itemId]) return;

  const itemLinks = index[itemKey][itemId];

  for (const linkedItem of itemLinks.isLinkedTo.notes) {
    if (index.notes[linkedItem]) {
      index.notes[linkedItem].isReferencedIn[
        itemType === ItemTypes.NOTE ? Modes.NOTES : Modes.CHECKLISTS
      ] = index.notes[linkedItem].isReferencedIn[
        itemType === ItemTypes.NOTE ? Modes.NOTES : Modes.CHECKLISTS
      ].filter((ref) => ref !== itemId);
    }
  }

  for (const linkedItem of itemLinks.isLinkedTo.checklists) {
    if (index.checklists[linkedItem]) {
      index.checklists[linkedItem].isReferencedIn[
        itemType === ItemTypes.NOTE ? Modes.NOTES : Modes.CHECKLISTS
      ] = index.checklists[linkedItem].isReferencedIn[
        itemType === ItemTypes.NOTE ? Modes.NOTES : Modes.CHECKLISTS
      ].filter((ref) => ref !== itemId);
    }
  }

  for (const referencingItem of itemLinks.isReferencedIn.notes) {
    if (index.notes[referencingItem]) {
      index.notes[referencingItem].isLinkedTo[
        itemType === ItemTypes.NOTE ? Modes.NOTES : Modes.CHECKLISTS
      ] = index.notes[referencingItem].isLinkedTo[
        itemType === ItemTypes.NOTE ? Modes.NOTES : Modes.CHECKLISTS
      ].filter((link) => link !== itemId);
    }
  }

  for (const referencingItem of itemLinks.isReferencedIn.checklists) {
    if (index.checklists[referencingItem]) {
      index.checklists[referencingItem].isLinkedTo[
        itemType === ItemTypes.NOTE ? Modes.NOTES : Modes.CHECKLISTS
      ] = index.checklists[referencingItem].isLinkedTo[
        itemType === ItemTypes.NOTE ? Modes.NOTES : Modes.CHECKLISTS
      ].filter((link) => link !== itemId);
    }
  }

  delete index[itemKey][itemId];

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

export const updateReferencingContent = async (
  username: string,
  itemType: ItemType,
  oldItemId: string,
  newItemId: string,
  newTitle: string
): Promise<void> => {
  const index = await readLinkIndex(username);
  const itemKey = `${itemType}s`;

  if (!index[itemKey][oldItemId]) return;

  const referencingNotes = index[itemKey][oldItemId].isReferencedIn.notes || [];
  const referencingChecklists =
    index[itemKey][oldItemId].isReferencedIn.checklists || [];

  const oldHref = `/${itemType}/${oldItemId}`;
  const newHref = `/${itemType}/${newItemId}`;

  for (const noteId of referencingNotes) {
    try {
      const note = await getNoteById(
        decodeId(noteId.split("/").pop() || ""),
        decodeCategoryPath(noteId.split("/").slice(0, -1).join("/")),
        username
      );
      if (!note) continue;

      let updatedContent = note.content;

      const markdownRegex = new RegExp(`\\[([^\\]]+)\\]\\(${oldHref}\\)`, "g");
      updatedContent = updatedContent.replace(
        markdownRegex,
        `[${newTitle}](${newHref})`
      );

      const htmlHrefRegex = new RegExp(`href="${oldHref}"`, "g");
      updatedContent = updatedContent.replace(
        htmlHrefRegex,
        `href="${newHref}"`
      );
      const htmlTitleRegex = new RegExp(`data-title="[^"]*"`, "g");
      updatedContent = updatedContent.replace(
        htmlTitleRegex,
        `data-title="${newTitle}"`
      );

      if (updatedContent !== note.content) {
        const updatedNote = { ...note, content: updatedContent };
        const markdown = `# ${updatedNote.title}\n\n${updatedNote.content}`;
        const ownerDir = path.join(
          process.cwd(),
          "data",
          NOTES_FOLDER,
          note.owner!
        );
        const categoryDir = path.join(
          ownerDir,
          updatedNote.category || "Uncategorized"
        );
        await fs.mkdir(categoryDir, { recursive: true });
        const filePath = path.join(
          categoryDir,
          `${encodeId(updatedNote.id)}.md`
        );
        await serverWriteFile(filePath, markdown);

        const links = parseInternalLinks(updatedContent);
        await updateIndexForItem(username, "note", noteId, links);
      }
    } catch (error) {
      console.warn(`Failed to update referencing note ${noteId}:`, error);
    }
  }

  for (const checklistId of referencingChecklists) {
    try {
      const checklist = await getListById(
        decodeId(checklistId.split("/").pop() || ""),
        username,
        decodeCategoryPath(checklistId.split("/").slice(0, -1).join("/"))
      );
      if (!checklist) continue;

      let contentChanged = false;
      const updatedItems = checklist.items.map((item) => {
        let updatedText = item.text;

        const markdownRegex = new RegExp(
          `\\[([^\\]]+)\\]\\(${oldHref}\\)`,
          "g"
        );
        updatedText = updatedText.replace(
          markdownRegex,
          `[${newTitle}](${newHref})`
        );

        const htmlHrefRegex = new RegExp(`href="${oldHref}"`, "g");
        updatedText = updatedText.replace(htmlHrefRegex, `href="${newHref}"`);
        const htmlTitleRegex = new RegExp(`data-title="[^"]*"`, "g");
        updatedText = updatedText.replace(
          htmlTitleRegex,
          `data-title="${newTitle}"`
        );

        if (updatedText !== item.text) {
          contentChanged = true;
          return { ...item, text: updatedText };
        }
        return item;
      });

      if (contentChanged) {
        const updatedChecklist = { ...checklist, items: updatedItems };
        const header =
          updatedChecklist.type === "task"
            ? `# ${updatedChecklist.title}\n<!-- type:task -->\n`
            : `# ${updatedChecklist.title}\n`;
        const itemsMarkdown = updatedItems
          .sort((a, b) => a.order - b.order)
          .map((item) => {
            const prefix =
              updatedChecklist.type === "task"
                ? item.status === "completed"
                  ? "- [x] "
                  : "- [ ] "
                : "- ";
            return prefix + item.text;
          })
          .join("\n");
        const markdown = `${header}\n${itemsMarkdown}`;

        const ownerDir = path.join(
          process.cwd(),
          "data",
          CHECKLISTS_FOLDER,
          checklist.owner!
        );
        const categoryDir = path.join(
          ownerDir,
          updatedChecklist.category || "Uncategorized"
        );
        await fs.mkdir(categoryDir, { recursive: true });
        const filePath = path.join(
          categoryDir,
          `${encodeId(updatedChecklist.id)}.md`
        );
        await serverWriteFile(filePath, markdown);

        const content = updatedItems.map((i) => i.text).join("\n");
        const links = parseInternalLinks(content);
        await updateIndexForItem(username, "checklist", checklistId, links);
      }
    } catch (error) {
      console.warn(
        `Failed to update referencing checklist ${checklistId}:`,
        error
      );
    }
  }
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
    const category =
      note.category && note.category !== "" && note.category !== "/"
        ? note.category
        : "Uncategorized";
    const itemKey = encodeCategoryPath(`${category}/${note.id}`);
    newIndex.notes[itemKey] = {
      isLinkedTo: { notes: [], checklists: [] },
      isReferencedIn: { notes: [], checklists: [] },
    };
  }

  for (const checklist of allChecklists) {
    const category =
      checklist.category &&
      checklist.category !== "" &&
      checklist.category !== "/"
        ? checklist.category
        : "Uncategorized";
    const itemKey = encodeCategoryPath(`${category}/${checklist.id}`);
    newIndex.checklists[itemKey] = {
      isLinkedTo: { notes: [], checklists: [] },
      isReferencedIn: { notes: [], checklists: [] },
    };
  }

  for (const note of allNotes) {
    const category =
      note.category && note.category !== "" && note.category !== "/"
        ? note.category
        : "Uncategorized";
    const itemKey = encodeCategoryPath(`${category}/${note.id}`);
    const links = parseInternalLinks(note.content);
    newIndex.notes[itemKey].isLinkedTo = {
      notes: links
        .filter((l) => l.type === ItemTypes.NOTE)
        .map((l) => resolveLinkPath(l.path, l.type as ItemType, newIndex))
        .filter((path): path is string => path !== null),
      checklists: links
        .filter((l) => l.type === ItemTypes.CHECKLIST)
        .map((l) => resolveLinkPath(l.path, l.type as ItemType, newIndex))
        .filter((path): path is string => path !== null),
    };
  }

  for (const checklist of allChecklists) {
    const category =
      checklist.category &&
      checklist.category !== "" &&
      checklist.category !== "/"
        ? checklist.category
        : "Uncategorized";
    const itemKey = encodeCategoryPath(`${category}/${checklist.id}`);
    const content = checklist.items.map((i) => i.text).join("\n");
    const links = parseInternalLinks(content);
    newIndex.checklists[itemKey].isLinkedTo = {
      notes: links
        .filter((l) => l.type === ItemTypes.NOTE)
        .map((l) => resolveLinkPath(l.path, l.type as ItemType, newIndex))
        .filter((path): path is string => path !== null),
      checklists: links
        .filter((l) => l.type === ItemTypes.CHECKLIST)
        .map((l) => resolveLinkPath(l.path, l.type as ItemType, newIndex))
        .filter((path): path is string => path !== null),
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
        ...itemLinks.isLinkedTo.notes.map((path) => ({
          type: ItemTypes.NOTE,
          path,
        })),
        ...itemLinks.isLinkedTo.checklists.map((path) => ({
          type: ItemTypes.CHECKLIST,
          path,
        })),
      ]) {
        const resolvedPath = resolveLinkPath(
          link.path,
          link.type as ItemType,
          newIndex
        );

        if (resolvedPath) {
          const targetKey = `${link.type}s`;
          const finalResolvedPath = resolvedPath.includes("/")
            ? resolvedPath
            : `Uncategorized/${resolvedPath}`;
          newIndex[targetKey][finalResolvedPath].isReferencedIn[
            itemType === Modes.NOTES ? Modes.NOTES : Modes.CHECKLISTS
          ].push(itemId);
        }
      }
    }
  }

  await writeLinkIndex(username, newIndex);
};
