import { Note } from "@/app/_types";
import { parseNoteContent } from "@/app/_utils/client-parser-utils";
import { noteStats } from "@/app/_utils/note-stats-utils";

type ParsedNote = ReturnType<typeof parseNoteContent>;

export const SEALED_STATS: ReturnType<typeof noteStats> = {
  excerpt: "",
  wordCount: 0,
  charCount: 0,
  readingTime: 0,
};

export const isNoteEncrypted = (
  note: Pick<Note, "encrypted">,
  parsed?: Pick<ParsedNote, "encrypted"> | null,
): boolean => Boolean(parsed?.encrypted ?? note.encrypted);

export const parsedNoteOf = (note: Pick<Note, "rawContent" | "id">): ParsedNote | null =>
  note.rawContent ? parseNoteContent(note.rawContent, note.id) : null;

export const noteDisplayOf = (note: Note) => {
  const parsed = parsedNoteOf(note);
  const isEncrypted = isNoteEncrypted(note, parsed);
  const content = parsed?.content || note.content || "";

  return {
    title: parsed?.title || note.title,
    content,
    isEncrypted,
    stats: isEncrypted ? SEALED_STATS : noteStats(content),
  };
};

export const noteExcerptOf = (note: Note): string =>
  isNoteEncrypted(note) ? "" : noteStats(note.content || "").excerpt;
