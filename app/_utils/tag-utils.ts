import { Note, Checklist, TagsIndex, TagInfo } from "@/app/_types";

export type { TagsIndex, TagInfo };

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

const ensureTagEntry = (index: TagsIndex, normalizedTag: string) => {
  if (!index[normalizedTag]) {
    index[normalizedTag] = {
      name: normalizedTag,
      displayName: getDisplayName(normalizedTag),
      parent: getParentTag(normalizedTag),
      noteUuids: [],
      checklistUuids: [],
      totalCount: 0,
    };
  }
};

export const buildTagsIndex = (
  notes: Partial<Note>[],
  checklists?: Partial<Checklist>[],
): TagsIndex => {
  const index: TagsIndex = {};
  const notesList = Array.isArray(notes) ? notes : [];
  const checklistsList =
    checklists !== undefined && Array.isArray(checklists) ? checklists : [];

  for (const note of notesList) {
    if (!note.tags || !note.uuid) continue;

    for (const tag of note.tags) {
      const normalizedTag = normalizeTag(tag);
      if (!normalizedTag) continue;

      ensureTagEntry(index, normalizedTag);

      if (!index[normalizedTag].noteUuids.includes(note.uuid)) {
        index[normalizedTag].noteUuids.push(note.uuid);
      }

      const ancestors = getAncestorTags(normalizedTag);
      for (const ancestor of ancestors) {
        ensureTagEntry(index, ancestor);
      }
    }
  }

  for (const checklist of checklistsList) {
    if (!checklist.tags || !checklist.uuid) continue;

    for (const tag of checklist.tags) {
      const normalizedTag = normalizeTag(tag);
      if (!normalizedTag) continue;

      ensureTagEntry(index, normalizedTag);

      if (!index[normalizedTag].checklistUuids.includes(checklist.uuid)) {
        index[normalizedTag].checklistUuids.push(checklist.uuid);
      }

      const ancestors = getAncestorTags(normalizedTag);
      for (const ancestor of ancestors) {
        ensureTagEntry(index, ancestor);
      }
    }
  }

  for (const tagName of Object.keys(index)) {
    const tag = index[tagName];
    const descendantUuids = new Set<string>([
      ...tag.noteUuids,
      ...tag.checklistUuids,
    ]);

    for (const otherTagName of Object.keys(index)) {
      if (otherTagName.startsWith(tagName + "/")) {
        for (const uuid of index[otherTagName].noteUuids) {
          descendantUuids.add(uuid);
        }
        for (const uuid of index[otherTagName].checklistUuids) {
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

  const codeBlockRegex =
    /```[\s\S]*?```|`[^`]+`|<code[^>]*>[\s\S]*?<\/code>|<pre[^>]*>[\s\S]*?<\/pre>|<!--[\s\S]*?-->|<[a-zA-Z\/][^>]*>/gi;
  const contentWithoutCode = content.replace(codeBlockRegex, " ");

  const hashtagRegex = /(?:^|[\s(])#([a-zA-Z][a-zA-Z0-9_/-]*)/g;
  while ((match = hashtagRegex.exec(contentWithoutCode)) !== null) {
    const tag = normalizeTag(match[1]);
    if (tag && !tag.includes("//") && !tag.endsWith("/")) {
      tags.add(tag);
    }
  }

  return Array.from(tags);
};

const TAG_SPLIT = /[,\s]+/;

export const tagList = (value: unknown): string[] => {
  const raw = typeof value === "string" ? value.split(TAG_SPLIT) : Array.isArray(value) ? value : [];
  const tags = raw.map((tag) => normalizeTag(String(tag))).filter(Boolean);
  return Array.from(new Set(tags)).sort();
};

export const mergeTags = (stored: unknown, before: string, after: string): string[] => {
  const was = new Set(extractHashtagsFromContent(before));
  const kept = tagList(stored).filter((tag) => !was.has(tag));
  return tagList([...kept, ...extractHashtagsFromContent(after)]);
};

export interface TagSource {
  tag: string;
  inText: boolean;
  inFrontmatter: boolean;
  leaving: boolean;
}

export const tagSources = (frontmatter: unknown, text: string, savedText = text): TagSource[] => {
  const stored = new Set(tagList(frontmatter));
  const written = new Set(extractHashtagsFromContent(text));
  const saved = new Set(extractHashtagsFromContent(savedText));
  return tagList([...Array.from(stored), ...Array.from(written)]).map((tag) => ({
    tag,
    inText: written.has(tag),
    inFrontmatter: stored.has(tag),
    leaving: stored.has(tag) && saved.has(tag) && !written.has(tag),
  }));
};

export const tagHref = (tag: string): string =>
  `/?mode=tags&tag=${encodeURIComponent(normalizeTag(tag))}`;

export const tagMatchesFilter = (
  noteTag: string,
  filterTag: string,
): boolean => {
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

export const getChildTags = (
  tagsIndex: TagsIndex,
  parentTag: string,
): TagInfo[] => {
  const children: TagInfo[] = [];

  for (const tag of Object.values(tagsIndex)) {
    if (tag.parent === parentTag) {
      children.push(tag);
    }
  }

  return children.sort((a, b) => a.name.localeCompare(b.name));
};
