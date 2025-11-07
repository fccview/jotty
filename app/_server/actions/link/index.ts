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
  buildCategoryPath,
} from "@/app/_utils/global-utils";
import { ItemType } from "@/app/_types";
import { NOTES_FOLDER } from "@/app/_consts/notes";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";

/**
 * Reference to an item that can be identified by path (mutable) or UUID (immutable)
 * During migration, both path and UUID are stored
 */
export interface ItemReference {
  path: string;   // Mutable - can change when category changes
  uuid?: string;  // Immutable - permanent identifier for linking
}

/**
 * Link index structure - UUID-based keys with embedded lookup table
 * - Items indexed by UUID
 * - uuidLookup: maps UUID -> current path
 * - Legacy items without UUID indexed by path (for backward compatibility)
 */
export interface LinkIndex {
  notes: Record<string, ItemLinks>;      // key: uuid (preferred) or path (legacy)
  checklists: Record<string, ItemLinks>; // key: uuid (preferred) or path (legacy)
  uuidLookup: Record<string, string>;     // UUID -> current path mapping
  [key: string]: any;
}

/**
 * Links for a specific item
 * Now stores ItemReference objects with both path and UUID
 */
export interface ItemLinks {
  isLinkedTo: {
    notes: ItemReference[];      // Items this item links to
    checklists: ItemReference[];
  };
  isReferencedIn: {
    notes: ItemReference[];      // Items that reference this item
    checklists: ItemReference[];
  };
}

export interface LinkTarget {
  type: ItemType;
  path?: string;  // Path for legacy path-based links
  uuid?: string;  // UUID for new UUID-based links (preferred)
}

const INDEX_FILENAME = ".index.json";

const getIndexFilePath = async (username: string): Promise<string> => {
  const userDir = await getUserModeDir(Modes.NOTES, username);
  return path.join(userDir, INDEX_FILENAME);
};


/**
 * Resolve a UUID to its current path using the lookup table
 */
export const resolveUuidToPath = async (username: string, uuid: string): Promise<string | null> => {
  const index = await readLinkIndex(username);
  return index.uuidLookup[uuid] || null;
};

/**
 * Update the UUID lookup table for an item
 */
export const updateUuidLookup = async (
  username: string,
  uuid: string,
  newPath: string
): Promise<void> => {
  const index = await readLinkIndex(username);
  index.uuidLookup[uuid] = newPath;
  await writeLinkIndex(username, index);
};

/**
 * Ensure an item has a UUID, creating one if necessary
 * Returns the UUID of the item
 */
export const ensureItemHasUuid = async (
  username: string,
  itemType: ItemType,
  itemId: string,
  category?: string
): Promise<string> => {
  const { generateUUID, extractUUIDFromMarkdown, addUUIDToMarkdown } = await import(
    "@/app/_utils/global-utils"
  );

  if (itemType === ItemTypes.NOTE) {
    const { getNoteById } = await import("@/app/_server/actions/note");
    const note = await getNoteById(itemId, category);

    if (!note) throw new Error(`Note not found: ${category}/${itemId}`);

    if (note.uuid) return note.uuid;

    // Generate UUID and save to file
    const uuid = generateUUID();
    const userDir = await getUserModeDir(Modes.NOTES, username);
    const filePath = path.join(userDir, category || "Uncategorized", `${itemId}.md`);

    const currentContent = await serverReadFile(filePath);
    const updatedContent = addUUIDToMarkdown(currentContent, uuid);
    await serverWriteFile(filePath, updatedContent);

    // Update lookup table
    const itemPath = buildCategoryPath(category || "Uncategorized", itemId);
    await updateUuidLookup(username, uuid, decodeCategoryPath(itemPath));

    return uuid;
  } else {
    const { getListById } = await import("@/app/_server/actions/checklist");
    const checklist = await getListById(itemId, username, category);

    if (!checklist) throw new Error(`Checklist not found: ${category}/${itemId}`);

    if (checklist.uuid) return checklist.uuid;

    // Generate UUID and save to file
    const uuid = generateUUID();
    checklist.uuid = uuid;

    // Save UUID to checklist file (same as notes)
    const userDir = await getUserModeDir(Modes.CHECKLISTS, username);
    const filePath = path.join(userDir, category || "Uncategorized", `${itemId}.md`);

    const currentContent = await serverReadFile(filePath);
    const updatedContent = addUUIDToMarkdown(currentContent, uuid);
    await serverWriteFile(filePath, updatedContent);

    // Update lookup table
    const itemPath = buildCategoryPath(category || "Uncategorized", itemId);
    await updateUuidLookup(username, uuid, decodeCategoryPath(itemPath));

    return uuid;
  }
};

/**
 * Convert UUID-based links in content to path-based links for rendering
 */
export const resolveUuidLinks = async (username: string, content: string): Promise<string> => {
  const index = await readLinkIndex(username);
  const uuidLookup = index.uuidLookup;

  // Replace jotty://type:uuid links with /type/path
  return content.replace(
    /jotty:\/\/(note|checklist):([a-f0-9-]+)/g,
    (match, type, uuid) => {
      const path = uuidLookup[uuid];
      if (path) {
        return `/${type}/${encodeCategoryPath(path)}`;
      }
      return match; // Keep original if UUID not found
    }
  );
};

// ============================================================================
// Migration Helpers - Handle both old (string[]) and new (ItemReference[]) formats
// ============================================================================

/**
 * Check if array contains old format (strings) or new format (ItemReference objects)
 */
function isOldFormat(arr: any[]): arr is string[] {
  return arr.length === 0 || typeof arr[0] === 'string';
}

/**
 * Convert old format string array to new ItemReference array
 */
function migrateToItemReferences(paths: string[]): ItemReference[] {
  return paths.map(path => ({ path, uuid: undefined }));
}

/**
 * Normalize ItemLinks to always use ItemReference format
 * Handles legacy indexes that still use string arrays
 */
function normalizeItemLinks(links: any): ItemLinks {
  if (!links) {
    return {
      isLinkedTo: { notes: [], checklists: [] },
      isReferencedIn: { notes: [], checklists: [] }
    };
  }

  return {
    isLinkedTo: {
      notes: isOldFormat(links.isLinkedTo?.notes || [])
        ? migrateToItemReferences(links.isLinkedTo.notes)
        : (links.isLinkedTo?.notes || []),
      checklists: isOldFormat(links.isLinkedTo?.checklists || [])
        ? migrateToItemReferences(links.isLinkedTo.checklists)
        : (links.isLinkedTo?.checklists || [])
    },
    isReferencedIn: {
      notes: isOldFormat(links.isReferencedIn?.notes || [])
        ? migrateToItemReferences(links.isReferencedIn.notes)
        : (links.isReferencedIn?.notes || []),
      checklists: isOldFormat(links.isReferencedIn?.checklists || [])
        ? migrateToItemReferences(links.isReferencedIn.checklists)
        : (links.isReferencedIn?.checklists || [])
    }
  };
}

export const readLinkIndex = async (username: string): Promise<LinkIndex> => {
  try {
    const indexPath = await getIndexFilePath(username);
    const content = await serverReadFile(indexPath);
    const rawIndex = JSON.parse(content) as any;

    // Normalize all ItemLinks to new format (ItemReference[])
    const normalizedIndex: LinkIndex = {
      notes: {},
      checklists: {},
      uuidLookup: rawIndex.uuidLookup || {}
    };

    // Normalize notes
    for (const [key, links] of Object.entries(rawIndex.notes || {})) {
      normalizedIndex.notes[key] = normalizeItemLinks(links);
    }

    // Normalize checklists
    for (const [key, links] of Object.entries(rawIndex.checklists || {})) {
      normalizedIndex.checklists[key] = normalizeItemLinks(links);
    }

    return normalizedIndex;
  } catch {
    return {
      notes: {},
      checklists: {},
      uuidLookup: {}
    };
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

  // Legacy HTML format: href="/note/Category/id" or href="/checklist/Category/id"
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

  // Legacy markdown format: [text](/note/Category/id) or [text](/checklist/Category/id)
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

  // New UUID format: [text](jotty://type:uuid)
  const uuidRegex = /\[([^\]]+)\]\(jotty:\/\/(note|checklist):([a-f0-9-]+)\)/g;
  while ((match = uuidRegex.exec(content)) !== null) {
    const [, , type, uuid] = match;

    links.push({
      type: type as ItemType,
      uuid,
    });
  }

  // Remove duplicates (by type + path/uuid)
  const uniqueLinks = links.filter(
    (link, index, self) =>
      index ===
      self.findIndex((l) =>
        l.type === link.type &&
        ((l.path && link.path && l.path === link.path) ||
          (l.uuid && link.uuid && l.uuid === link.uuid))
      )
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

/**
 * Update link index for an item - now supports UUID-based indexing
 * @param username - Username
 * @param itemType - Type of item (note or checklist)
 * @param itemId - Path-based ID (category/id) for backward compatibility
 * @param currentLinks - Links found in the item's content
 * @param uuid - Optional UUID for the item (preferred index key)
 */
// Removed updateIndexForItem - new UUID system rebuilds index from scratch

/**
 * Remove an item from the link index
 * @param username - Username
 * @param itemType - Type of item
 * @param itemId - Path or UUID of item to remove
 */
// Removed removeItemFromIndex - new UUID system rebuilds index from scratch

/**
 * Update item category - WITH UUID-based indexing!
 *
 * With UUIDs as keys, we need to update the path field in ItemReference objects
 * when the item's category changes. UUID stays the same!
 *
 * @param username - Username
 * @param itemType - Type of item
 * @param oldItemId - Old path (category/id)
 * @param newItemId - New path (category/id)
 * @param uuid - UUID of the item (should always be provided for new items)
 */
export const updateItemCategory = async (
  username: string,
  itemType: ItemType,
  oldItemId: string,
  newItemId: string,
  uuid?: string
): Promise<void> => {
  if (oldItemId === newItemId || !uuid) return;

  // With UUID-based linking, category changes are simple:
  // Just update the UUID lookup table with the new path
  const newPath = decodeCategoryPath(newItemId);
  await updateUuidLookup(username, uuid, newPath);

  // The link index doesn't need updating since relationships are UUID-based
  // and paths in ItemReference are just for display/legacy compatibility
};

/**
 * Migrate legacy path-based links to UUID-based links in all content
 */
export const migrateToUuidLinks = async (username: string): Promise<void> => {
  const { getNotes } = await import("@/app/_server/actions/note");
  const { getLists } = await import("@/app/_server/actions/checklist");

  const [notesResult, checklistsResult] = await Promise.all([
    getNotes(username),
    getLists(username),
  ]);

  const allNotes = notesResult.success ? notesResult.data || [] : [];
  const allChecklists = checklistsResult.success ? checklistsResult.data || [] : [];

  // Create reverse lookup: path -> uuid from all items
  const pathToUuid = new Map<string, string>();
  for (const note of allNotes) {
    if (note.uuid) {
      const path = `${note.category || "Uncategorized"}/${note.id}`;
      pathToUuid.set(path, note.uuid);
    }
  }
  for (const checklist of allChecklists) {
    if (checklist.uuid) {
      const path = `${checklist.category || "Uncategorized"}/${checklist.id}`;
      pathToUuid.set(path, checklist.uuid);
    }
  }

  // Migrate notes
  for (const note of allNotes) {
    let content = note.content;
    let updated = false;

    // Replace path-based markdown links
    content = content.replace(
      /\[([^\]]+)\]\(\/(note|checklist)\/([^)]+)\)/g,
      (match, text, type, categoryPath) => {
        // URL decode the category path
        const decodedCategoryPath = decodeURIComponent(categoryPath);
        const pathParts = decodedCategoryPath.split("/");
        const id = pathParts[pathParts.length - 1];
        const category = pathParts.slice(0, -1).join("/");
        const fullPath = category ? `${category}/${id}` : id;

        const uuid = pathToUuid.get(fullPath);
        if (uuid) {
          updated = true;
          // Determine type based on whether it's a note or checklist
          const isChecklist = allChecklists.some(c => c.id === id && c.category === category);
          const type = isChecklist ? "checklist" : "note";
          return `[${text}](jotty://${type}:${uuid})`;
        }
        return match; // Keep original if no UUID found
      }
    );

    // Replace path-based HTML links
    content = content.replace(
      /href="\/(note|checklist)\/([^"]+)"/g,
      (match, type, categoryPath) => {
        // URL decode the category path
        const decodedCategoryPath = decodeURIComponent(categoryPath);
        const pathParts = decodedCategoryPath.split("/");
        const id = pathParts[pathParts.length - 1];
        const category = pathParts.slice(0, -1).join("/");
        const fullPath = category ? `${category}/${id}` : id;

        const uuid = pathToUuid.get(fullPath);
        if (uuid) {
          updated = true;
          // Determine type based on whether it's a note or checklist
          const isChecklist = allChecklists.some(c => c.id === id && c.category === category);
          const type = isChecklist ? "checklist" : "note";
          return `href="jotty://${type}:${uuid}"`;
        }
        return match; // Keep original if no UUID found
      }
    );

    if (updated) {
      // Save updated content
      const updatedNote = { ...note, content };
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
    }
  }

  // Migrate checklists
  for (const checklist of allChecklists) {
    let contentChanged = false;
    const updatedItems = checklist.items.map((item) => {
      let text = item.text;

      // Replace path-based markdown links in checklist items
      text = text.replace(
        /\[([^\]]+)\]\(\/(note|checklist)\/([^)]+)\)/g,
        (match, linkText, type, categoryPath) => {
          // URL decode the category path
          const decodedCategoryPath = decodeURIComponent(categoryPath);
          const pathParts = decodedCategoryPath.split("/");
          const id = pathParts[pathParts.length - 1];
          const category = pathParts.slice(0, -1).join("/");
          const fullPath = category ? `${category}/${id}` : id;

          const uuid = pathToUuid.get(fullPath);
          if (uuid) {
            contentChanged = true;
            // Determine type based on whether it's a note or checklist
            const isChecklist = allChecklists.some(c => c.id === id && c.category === category);
            const type = isChecklist ? "checklist" : "note";
            return `[${linkText}](jotty://${type}:${uuid})`;
          }
          return match;
        }
      );

      if (text !== item.text) {
        contentChanged = true;
        return { ...item, text };
      }
      return item;
    });

    if (contentChanged) {
      // Save updated checklist
      const updatedChecklist = { ...checklist, items: updatedItems };
      const listDir = path.join(
        process.cwd(),
        "data",
        CHECKLISTS_FOLDER,
        checklist.owner!
      );
      const categoryDir = path.join(
        listDir,
        updatedChecklist.category || "Uncategorized"
      );
      await fs.mkdir(categoryDir, { recursive: true });
      const filePath = path.join(
        categoryDir,
        `${encodeId(updatedChecklist.id)}.md`
      );

      const header = updatedChecklist.type === "task"
        ? `# ${updatedChecklist.title}\n<!-- type:task -->\n`
        : `# ${updatedChecklist.title}\n`;
      const itemsMarkdown = updatedItems
        .sort((a, b) => a.order - b.order)
        .map((item) => {
          const prefix = updatedChecklist.type === "task"
            ? item.status === "completed" ? "- [x] " : "- [ ] "
            : "- ";
          return prefix + item.text;
        })
        .join("\n");
      const markdown = `${header}\n${itemsMarkdown}`;

      await serverWriteFile(filePath, markdown);
    }
  }
};

/**
 * With UUID-based linking, content updates are no longer needed!
 * Links are immutable and point to UUIDs, not paths.
 * This function is kept for migration purposes only.
 */
export const updateReferencingContent = async (
  username: string,
  itemType: ItemType,
  oldItemId: string,
  newItemId: string,
  newTitle: string,
  itemUuid?: string
): Promise<void> => {
  // With UUID-based linking, category changes don't require content updates
  // Links are immutable and point to UUIDs, not paths
  // The UUID lookup table handles path resolution

  // This function is kept for potential future migration of legacy path-based links
  // For now, it does nothing since new links use UUIDs
};

/**
 * Rebuild the entire link index and UUID lookup from scratch
 * Much simpler than the old path-based system!
 */
export const rebuildLinkIndex = async (username: string): Promise<void> => {
  const { generateUUID, extractUUIDFromMarkdown, addUUIDToMarkdown } = await import(
    "@/app/_utils/global-utils"
  );

  const [notesResult, checklistsResult] = await Promise.all([
    getNotes(username),
    getLists(username),
  ]);

  const allNotes = notesResult.success ? notesResult.data || [] : [];
  const allChecklists = checklistsResult.success ? checklistsResult.data || [] : [];

  // Build simple UUID-to-UUID relationship index
  const newIndex: LinkIndex = {
    notes: {},
    checklists: {},
    uuidLookup: {},
  };

  // Ensure all items have UUIDs and build lookup table
  for (const note of allNotes) {
    let uuid = note.uuid;
    if (!uuid) {
      // Try to extract from content
      const extracted = extractUUIDFromMarkdown(note.content);
      if (extracted) {
        uuid = extracted;
        note.uuid = uuid;
      } else {
        // Generate new UUID
        uuid = generateUUID();
        note.uuid = uuid;

        // Save UUID to file
        try {
          const category = note.category || "Uncategorized";
          const userDir = await getUserModeDir(Modes.NOTES, username);
          const filePath = path.join(userDir, category, `${note.id}.md`);
          const currentMarkdown = await serverReadFile(filePath);
          const updatedMarkdown = addUUIDToMarkdown(currentMarkdown, uuid);
          await serverWriteFile(filePath, updatedMarkdown);
        } catch (error) {
          console.warn(`Failed to add UUID to note ${note.id}:`, error);
        }
      }
    }

    // Add to lookup table
    const category = note.category || "Uncategorized";
    const itemPath = buildCategoryPath(category, note.id);
    newIndex.uuidLookup[uuid] = decodeCategoryPath(itemPath);
  }

  for (const checklist of allChecklists) {
    let uuid = checklist.uuid;
    if (!uuid) {
      // Try to extract from content (checklist items text)
      const content = checklist.items.map(item => item.text).join('\n');
      const extracted = extractUUIDFromMarkdown(content);
      if (extracted) {
        uuid = extracted;
        checklist.uuid = uuid;
      } else {
        // Generate new UUID
        uuid = generateUUID();
        checklist.uuid = uuid;

        // Save UUID to file
        try {
          const category = checklist.category || "Uncategorized";
          const userDir = await getUserModeDir(Modes.CHECKLISTS, username);
          const filePath = path.join(userDir, category, `${checklist.id}.md`);
          const currentMarkdown = await serverReadFile(filePath);
          const updatedMarkdown = addUUIDToMarkdown(currentMarkdown, uuid);
          await serverWriteFile(filePath, updatedMarkdown);
        } catch (error) {
          console.warn(`Failed to add UUID to checklist ${checklist.id}:`, error);
        }
      }
    }

    // Add to lookup table
    const category = checklist.category || "Uncategorized";
    const itemPath = buildCategoryPath(category, checklist.id);
    newIndex.uuidLookup[uuid] = decodeCategoryPath(itemPath);
  }


  // Initialize index entries
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

  // Build relationships by parsing content and looking up UUIDs
  for (const note of allNotes) {
    if (!note.uuid) continue;

    const links = parseInternalLinks(note.content);

    for (const link of links) {
      if (link.uuid) {
        // Direct UUID link - just add it
        newIndex.notes[note.uuid].isLinkedTo.notes.push({
          path: newIndex.uuidLookup[link.uuid] || "unknown",
          uuid: link.uuid
        });
      } else if (link.path) {
        // Legacy path-based link - resolve to UUID if possible
        const targetNote = allNotes.find(n => {
          const notePath = `${n.category || "Uncategorized"}/${n.id}`;
          return notePath === link.path || decodeCategoryPath(buildCategoryPath(n.category || "Uncategorized", n.id)) === link.path;
        });

        if (targetNote?.uuid) {
          newIndex.notes[note.uuid].isLinkedTo.notes.push({
            path: newIndex.uuidLookup[targetNote.uuid] || link.path,
            uuid: targetNote.uuid
          });
        }
      }
    }
  }

  // Build reverse relationships (isReferencedIn)
  for (const [sourceUuid, links] of Object.entries(newIndex.notes)) {
    for (const targetRef of links.isLinkedTo.notes) {
      if (targetRef.uuid && newIndex.notes[targetRef.uuid]) {
        const sourceRef: ItemReference = {
          path: newIndex.uuidLookup[sourceUuid] || "unknown",
          uuid: sourceUuid
        };

        if (!newIndex.notes[targetRef.uuid].isReferencedIn.notes.some(ref => ref.uuid === sourceUuid)) {
          newIndex.notes[targetRef.uuid].isReferencedIn.notes.push(sourceRef);
        }
      }
    }
  }

  // Save index
  await writeLinkIndex(username, newIndex);
};
