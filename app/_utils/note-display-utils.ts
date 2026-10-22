import { Note, NoteSummary } from "@/app/_types";
import { CARD_EXCERPT_LIMIT } from "@/app/_consts/notes";
import { parseNoteContent } from "@/app/_utils/client-parser-utils";
import { noteStats } from "@/app/_utils/note-stats-utils";

type ParsedNote = ReturnType<typeof parseNoteContent>;

export const SEALED_STATS: NoteSummary = {
  excerpt: "",
  wordCount: 0,
};

export const isNoteEncrypted = (
  note: Pick<Note, "encrypted">,
  parsed?: Pick<ParsedNote, "encrypted"> | null,
): boolean => Boolean(parsed?.encrypted ?? note.encrypted);

export const parsedNoteOf = (note: Pick<Note, "rawContent" | "id">): ParsedNote | null =>
  note.rawContent ? parseNoteContent(note.rawContent, note.id) : null;

const capped = (text: string, limit: number): string => {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const last = cut.charCodeAt(cut.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut;
};

export const summarizeNote = (note: Pick<Note, "content" | "encrypted">): NoteSummary => {
  if (isNoteEncrypted(note)) return SEALED_STATS;
  const { excerpt, wordCount } = noteStats(note.content || "");
  return { excerpt: capped(excerpt, CARD_EXCERPT_LIMIT), wordCount };
};

export const hasNoteBody = (note: Pick<Note, "excerpt">): boolean => note.excerpt === undefined;

const summaryOf = (note: Pick<Note, "excerpt" | "wordCount">): NoteSummary | null =>
  note.excerpt === undefined ? null : { excerpt: note.excerpt, wordCount: note.wordCount ?? 0 };

export const noteDisplayOf = (note: Note) => {
  const parsed = parsedNoteOf(note);
  const isEncrypted = isNoteEncrypted(note, parsed);
  const content = parsed?.content || note.content || "";

  return {
    title: parsed?.title || note.title,
    content,
    isEncrypted,
    hasBody: hasNoteBody(note),
    stats: isEncrypted ? SEALED_STATS : summaryOf(note) || noteStats(content),
  };
};

export const noteExcerptOf = (note: Note): string =>
  isNoteEncrypted(note) ? "" : note.excerpt ?? noteStats(note.content || "").excerpt;

export const withNoteBody = (note: Note, content: string): Note => {
  const bare: Note = { ...note, content };
  delete bare.excerpt;
  delete bare.wordCount;
  return bare;
};
