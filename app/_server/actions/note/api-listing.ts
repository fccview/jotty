import path from "path";
import type { Note, Result } from "@/app/_types";
import { NOTES_DIR } from "@/app/_consts/files";
import { mapPooled } from "@/app/_server/actions/lib/concurrency";
import { grepFilesMentioning } from "@/app/_utils/grep-utils";
import { withNoteBody } from "@/app/_utils/note-display-utils";
import { tagMatchesFilter } from "@/app/_utils/tag-utils";
import { page } from "@/app/_schemas/api/common";
import { getUserNotes } from "./queries";
import { noteBodyOf, unlistedNote } from "./bodies";
import type { ListedNote } from "./readers";

const BODY_READERS = 64;
const ASCII_ONLY = /^[\x20-\x7e]*$/;

export interface NoteListQuery {
  category?: string;
  tag?: string;
  q?: string;
  limit?: number;
  offset: number;
}

type Bodies = Map<ListedNote, Promise<string | null>>;

const _bodyOf = (bodies: Bodies, note: ListedNote): Promise<string | null> => {
  const known = bodies.get(note);
  if (known) return known;
  const read = note.content ? Promise.resolve(note.content) : noteBodyOf(note);
  bodies.set(note, read);
  return read;
};

const _grepHits = async (notes: ListedNote[], needle: string): Promise<Set<string> | null> => {
  if (!ASCII_ONLY.test(needle)) return null;
  const roots = Array.from(
    new Set(notes.flatMap((note) => (note.owner ? [path.join(process.cwd(), NOTES_DIR(note.owner))] : []))),
  );
  const found = await Promise.all(roots.map((root) => grepFilesMentioning(root, needle)));
  if (found.some((paths) => paths === null)) return null;
  return new Set(found.flatMap((paths) => paths || []).map((filePath) => path.resolve(filePath)));
};

const _mentioning = async (notes: ListedNote[], needle: string, bodies: Bodies): Promise<ListedNote[]> => {
  const hits = await _grepHits(notes, needle);
  const kept = await mapPooled(notes, BODY_READERS, async (note) => {
    if (note.title?.toLowerCase().includes(needle)) return note;
    if (hits && note.sourcePath && !hits.has(path.resolve(note.sourcePath))) return null;
    const body = await _bodyOf(bodies, note);
    return body?.toLowerCase().includes(needle) ? note : null;
  });
  return kept.filter((note): note is ListedNote => note !== null);
};

const _bodied = async (bodies: Bodies, note: ListedNote): Promise<Note> => {
  const body = await _bodyOf(bodies, note);
  return unlistedNote(body === null ? note : withNoteBody(note, body));
};

export const apiNoteListing = async (
  username: string,
  query: NoteListQuery,
): Promise<Result<{ notes: Note[]; total: number }>> => {
  const listed = await getUserNotes({ username, summarize: true, keepSources: true, verify: true });
  if (!listed.success || !listed.data) return { success: false, error: listed.error || "Failed to fetch notes" };

  const scoped = (listed.data as ListedNote[]).filter(
    (note) =>
      (!query.category || note.category === query.category) &&
      (!query.tag || (note.tags || []).some((tag) => tagMatchesFilter(tag, query.tag!))),
  );
  const bodies: Bodies = new Map();
  const needle = query.q?.toLowerCase();
  const matches = needle ? await _mentioning(scoped, needle, bodies) : scoped;

  return {
    success: true,
    data: {
      notes: await mapPooled(page(matches, query), BODY_READERS, (note) => _bodied(bodies, note)),
      total: matches.length,
    },
  };
};
