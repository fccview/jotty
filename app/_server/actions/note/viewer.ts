"use server";

import { ContentFilter, Note, NoteBody, Result } from "@/app/_types";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { isUuid } from "@/app/_consts/identity";
import { MAX_BODY_BATCH } from "@/app/_consts/browse";
import { sessionActor } from "@/app/_server/actions/lib/actor";
import { mapPooled } from "@/app/_server/actions/lib/concurrency";
import { canReach } from "@/app/_server/actions/share/queries";
import { canReachFile } from "@/app/_server/actions/share/access";
import { hasNoteBody } from "@/app/_utils/note-display-utils";
import { everyBody } from "./browse";
import { getNoteById, getUserNotes } from "./queries";
import type { ListedNote } from "./readers";

const BODY_READERS = 8;

const _readAs = async (uuid: string, username: string): Promise<Note | undefined> => {
  const seen = await getNoteById(uuid, username);
  if (seen) return seen;

  const allowed = await canReach(uuid, ItemTypes.NOTE, username, PermissionTypes.READ);

  return allowed ? getNoteById(uuid) : undefined;
};

export const viewNote = async (uuid: string): Promise<Note | undefined> => {
  if (!isUuid(uuid)) return undefined;

  const actor = await sessionActor();
  if ("error" in actor) return undefined;

  return _readAs(uuid, actor.username);
};

const _mayReadListed = async (note: ListedNote, username: string): Promise<boolean> => {
  if (!note.isShared) return true;
  if (!note.sourcePath) return false;
  return canReachFile(Modes.NOTES, note.sourcePath, username, PermissionTypes.READ);
};

const _listedBodies = async (
  wanted: string[],
  username: string,
): Promise<Map<string, string>> => {
  const asked = new Set(wanted);
  const bodies = new Map<string, string>();
  const listed = await getUserNotes({
    username,
    summarize: true,
    keepSources: true,
    bodiesFor: (notes) => notes.filter((note) => asked.has(note.uuid)).map((note) => note.uuid),
  });
  if (!listed.success || !listed.data) return bodies;

  const hits = (listed.data as ListedNote[]).filter(
    (note) => asked.has(note.uuid) && hasNoteBody(note),
  );
  for (const note of hits) {
    if (bodies.has(note.uuid)) continue;
    if (await _mayReadListed(note, username)) bodies.set(note.uuid, note.content || "");
  }
  return bodies;
};

export const readNoteBodies = async (uuids: string[]): Promise<Result<NoteBody[]>> => {
  if (!Array.isArray(uuids) || uuids.length > MAX_BODY_BATCH) {
    return { success: false, error: "Too many notes requested" };
  }

  const actor = await sessionActor();
  if ("error" in actor) return { success: false, error: actor.error };

  const wanted = Array.from(
    new Set(uuids.filter((uuid): uuid is string => typeof uuid === "string" && isUuid(uuid))),
  );

  try {
    const listed = wanted.length ? await _listedBodies(wanted, actor.username) : new Map();
    const read = await mapPooled(wanted, BODY_READERS, async (uuid) => {
      const known = listed.get(uuid);
      if (known !== undefined) return { uuid, content: known };
      const note = await _readAs(uuid, actor.username);
      return note ? { uuid, content: note.content } : null;
    });

    return { success: true, data: read.filter((body): body is NoteBody => body !== null) };
  } catch (error) {
    console.error("readNoteBodies failed:", error);
    return { success: false, error: "Failed to read notes" };
  }
};

export const getNotesForDisplay = async (
  filter?: ContentFilter | null,
  limit: number = 20,
  offset: number = 0,
) => {
  return getUserNotes({
    filter: filter || undefined,
    limit,
    offset: filter ? offset : undefined,
    summarize: true,
    bodiesFor: everyBody,
  });
};
