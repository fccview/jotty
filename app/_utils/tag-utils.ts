import { Note } from "@/app/_types";

export interface TagInfo {
  name: string;
  displayName: string;
  parent: string | null;
  noteUuids: string[];
  totalCount: number;
}

export type TagsIndex = Record<string, TagInfo>;

export const normalizeTag = (tag: string): string => {
  return tag.toLowerCase().trim().replace(/^#/, "");
};

export const getAncestorTags = (tag: string): string[] => {
  const parts = tag.split("/");
  const ancestors: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    ancestors.push(parts.slice(0, i).join("/"));
  }
  return ancestors;
};

export const getParentTag = (tag: string): string | null => {
  const lastSlash = tag.lastIndexOf("/");
  if (lastSlash === -1) return null;
  return tag.substring(0, lastSlash);
};

export const getDisplayName = (tag: string): string => {
  const lastSlash = tag.lastIndexOf("/");
  if (lastSlash === -1) return tag;
  return tag.substring(lastSlash + 1);
};

export const buildTagsIndex = (notes: Partial<Note>[]): TagsIndex => {
  const index: TagsIndex = {};

  for (const note of notes) {
    if (!note.tags || !note.uuid) continue;

    for (const tag of note.tags) {
      const normalizedTag = normalizeTag(tag);
      if (!normalizedTag) continue;

      if (!index[normalizedTag]) {
        index[normalizedTag] = {
          name: normalizedTag,
          displayName: getDisplayName(normalizedTag),
          parent: getParentTag(normalizedTag),
          noteUuids: [],
          totalCount: 0,
        };
      }

      if (!index[normalizedTag].noteUuids.includes(note.uuid)) {
        index[normalizedTag].noteUuids.push(note.uuid);
      }

      const ancestors = getAncestorTags(normalizedTag);
      for (const ancestor of ancestors) {
        if (!index[ancestor]) {
          index[ancestor] = {
            name: ancestor,
            displayName: getDisplayName(ancestor),
            parent: getParentTag(ancestor),
            noteUuids: [],
            totalCount: 0,
          };
        }
      }
    }
  }

  for (const tagName of Object.keys(index)) {
    const tag = index[tagName];
    const descendantUuids = new Set<string>(tag.noteUuids);

    for (const otherTagName of Object.keys(index)) {
      if (otherTagName.startsWith(tagName + "/")) {
        for (const uuid of index[otherTagName].noteUuids) {
          descendantUuids.add(uuid);
        }
      }
    }

    tag.totalCount = descendantUuids.size;
  }

  return index;
};

export const extractHashtagsFromContent = (content: string): string[] => {
  const tags = new Set<string>();

  const dataTagRegex = /data-tag="([^"]+)"/g;
  let match;
  while ((match = dataTagRegex.exec(content)) !== null) {
    const tag = normalizeTag(match[1]);
    if (tag && !tag.includes("//") && !tag.endsWith("/")) {
      tags.add(tag);
    }
  }

  const codeBlockRegex = /```[\s\S]*?```|`[^`]+`|<code[^>]*>[\s\S]*?<\/code>|<pre[^>]*>[\s\S]*?<\/pre>/gi;
  const contentWithoutCode = content.replace(codeBlockRegex, "");

  const hashtagRegex = /(?:^|[\s(])#([a-zA-Z][a-zA-Z0-9_/-]*)/g;
  while ((match = hashtagRegex.exec(contentWithoutCode)) !== null) {
    const tag = normalizeTag(match[1]);
    if (tag && !tag.includes("//") && !tag.endsWith("/")) {
      tags.add(tag);
    }
  }

  return Array.from(tags);
};

export const tagMatchesFilter = (noteTag: string, filterTag: string): boolean => {
  const normalizedNoteTag = normalizeTag(noteTag);
  const normalizedFilterTag = normalizeTag(filterTag);

  if (normalizedNoteTag === normalizedFilterTag) return true;
  if (normalizedNoteTag.startsWith(normalizedFilterTag + "/")) return true;

  return false;
};

export const getAllUniqueTags = (notes: Partial<Note>[]): string[] => {
  const tags = new Set<string>();
  for (const note of notes) {
    if (note.tags) {
      for (const tag of note.tags) {
        tags.add(normalizeTag(tag));
      }
    }
  }
  return Array.from(tags).sort();
};

export const buildTagTree = (tagsIndex: TagsIndex): TagInfo[] => {
  const rootTags: TagInfo[] = [];

  for (const tag of Object.values(tagsIndex)) {
    if (!tag.parent) {
      rootTags.push(tag);
    }
  }

  return rootTags.sort((a, b) => a.name.localeCompare(b.name));
};

export const getChildTags = (tagsIndex: TagsIndex, parentTag: string): TagInfo[] => {
  const children: TagInfo[] = [];

  for (const tag of Object.values(tagsIndex)) {
    if (tag.parent === parentTag) {
      children.push(tag);
    }
  }

  return children.sort((a, b) => a.name.localeCompare(b.name));
};
