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
      noteCount: 0,
      checklistCount: 0,
      totalCount: 0,
    };
  }
};

type DirectCount = "noteCount" | "checklistCount";

const _tally = (
  index: TagsIndex,
  items: { uuid?: string; tags?: string[] }[],
  direct: DirectCount,
) => {
  for (const item of items) {
    if (!item.tags || !item.uuid) continue;
    const touched = new Set<string>();

    for (const tag of Array.from(new Set(item.tags.map(normalizeTag)))) {
      if (!tag) continue;
      ensureTagEntry(index, tag);
      index[tag][direct]++;
      touched.add(tag);
      for (const ancestor of getAncestorTags(tag)) {
        ensureTagEntry(index, ancestor);
        touched.add(ancestor);
      }
    }

    touched.forEach((tag) => index[tag].totalCount++);
  }
};

export const buildTagsIndex = (
  notes: Partial<Note>[],
  checklists?: Partial<Checklist>[],
): TagsIndex => {
  const index: TagsIndex = {};
  _tally(index, Array.isArray(notes) ? notes : [], "noteCount");
  _tally(index, Array.isArray(checklists) ? checklists : [], "checklistCount");
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
