import { Note } from "@/app/_types";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { ListView } from "@/app/_schemas/api/common";
import { isEncrypted } from "@/app/_utils/encryption-utils";

const EXCERPT_CHARS = 200;

type ListedNote = Partial<Note>;

export interface ApiNote {
  id?: string;
  title?: string;
  category: string;
  content?: string;
  excerpt?: string;
  encrypted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const _isLocked = (note: ListedNote): boolean =>
  Boolean(note.encrypted) || isEncrypted(note.content ?? "");

const _plain = (content: string): string =>
  content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => alias || target)
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const noteExcerpt = (content: string): string => {
  const flat = _plain(content);
  if (flat.length <= EXCERPT_CHARS) return flat;
  const cut = flat.slice(0, EXCERPT_CHARS);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > EXCERPT_CHARS / 2 ? cut.slice(0, lastSpace) : cut}...`;
};

export const toApiNote = (note: ListedNote, view: ListView = ListView.FULL): ApiNote => {
  const locked = _isLocked(note);
  return {
    id: note.uuid,
    title: note.title,
    category: note.category || UNCATEGORIZED,
    ...(view === ListView.SUMMARY
      ? { excerpt: locked ? undefined : noteExcerpt(note.content ?? "") }
      : { content: note.content }),
    ...(locked && { encrypted: true }),
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
};
