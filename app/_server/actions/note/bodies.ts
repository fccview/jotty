import type { Note } from "@/app/_types";
import { serverReadExisting } from "@/app/_server/actions/file";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { withNoteBody } from "@/app/_utils/note-display-utils";
import type { ListedNote } from "./readers";

export const noteBodyOf = async (note: ListedNote): Promise<string | null> => {
  const raw = note.sourcePath ? await serverReadExisting(note.sourcePath) : null;
  return raw === null ? null : extractYamlMetadata(raw).contentWithoutMetadata;
};

export const withBody = async (note: ListedNote): Promise<ListedNote> => {
  const body = await noteBodyOf(note);
  return body === null ? note : withNoteBody(note, body);
};

export const unlistedNote = (note: ListedNote): Note => {
  const bare = { ...note };
  delete bare.sourcePath;
  return bare;
};

export const bodiedNote = async (note: ListedNote): Promise<Note> => unlistedNote(await withBody(note));
