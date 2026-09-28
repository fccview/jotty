import { NextRequest, NextResponse } from "next/server";
import { dropNote, editNote } from "@/app/_server/actions/note/editor";
import { getNoteById, getUserNotes } from "@/app/_server/actions/note/queries";
import { resolveApiId } from "@/app/_server/actions/lib/legacy-lookup";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, envelope, okSchema } from "@/app/_schemas/api/common";
import {
  noteParams,
  notePatchBody,
  noteReadQuery,
  noteSchema,
  noteUpdateBody,
  warnedNote,
} from "@/app/_schemas/api/notes";
import { SPLICE_DENIED, SPLICE_MISSING, spliceNote } from "@/app/_server/actions/note/splice";
import { findReplace } from "@/app/_utils/note-edits";
import { sliceText } from "@/app/_utils/text-slice";
import { Modes } from "@/app/_types/enums";
import { MANAGED_WARNING, UNCATEGORIZED, isManaged } from "@/app/_consts/notes";

export const dynamic = "force-dynamic";

const NOT_FOUND = "Note not found";

/**
 * @deprecated Legacy category+slug fallback for the notes API, the twin of
 * listUuid in api-utils. Returns the param when it is already a uuid, otherwise
 * resolves the deprecated pair from ?category= and logs a WARNING. Goes away
 * with the rest of the slug lookups.
 */
const _noteUuid = async (
  request: NextRequest,
  noteId: string,
  username: string,
): Promise<string | null> =>
  resolveApiId(
    Modes.NOTES,
    noteId,
    request.nextUrl.searchParams.get("category"),
    username,
  );

const _ownNote = async (request: NextRequest, noteId: string, username: string) => {
  const uuid = await _noteUuid(request, noteId, username);
  const notes = await getUserNotes({ username });
  if (!notes.success || !notes.data) return { error: "Failed to fetch notes" };
  return { note: notes.data.find((n) => n.uuid === uuid) };
};

export const GET = defineRoute(
  {
    id: "getNote",
    method: HttpMethod.GET,
    path: "/notes/{noteId}",
    tag: ApiTag.NOTES,
    summary: "Get a note",
    description:
      "contentLength is the size of the whole content. For a very long note, pass offset and limit to read it in slices, and nextOffset says where the next slice starts.",
    params: noteParams,
    query: noteReadQuery,
    responses: {
      200: { description: "The note", schema: envelope(noteSchema) },
      401: ERRORS[401],
      404: ERRORS[404],
    },
  },
  async ({ request, user, params, query }) => {
    const uuid = await _noteUuid(request, params.noteId, user.username);
    const note = uuid ? await getNoteById(uuid, user.username) : undefined;
    if (!note) return refuse(NOT_FOUND, 404);


    return NextResponse.json({
      success: true,
      data: {
        id: note.uuid,
        title: note.title,
        category: note.category || UNCATEGORIZED,
        ...sliceText(note.content || "", query.offset, query.limit),
        tags: note.tags || [],
        ...(isManaged(note.extraMetadata) && { managed: true }),
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        owner: note.owner,
      },
    });
  },
);

export const PUT = defineRoute(
  {
    id: "updateNote",
    method: HttpMethod.PUT,
    path: "/notes/{noteId}",
    tag: ApiTag.NOTES,
    summary: "Update a note",
    description:
      "Fields left out keep their current value. content replaces the whole note, so read all of it first, checking contentLength, or use patchNote to change one part.",
    params: noteParams,
    body: noteUpdateBody,
    responses: {
      200: { description: "Updated note", schema: warnedNote },
      400: ERRORS[400],
      401: ERRORS[401],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params, body }) => {
    const { note, error } = await _ownNote(request, params.noteId, user.username);
    if (error) return refuse(error, 500);
    if (!note) return refuse(NOT_FOUND, 404);

    const formData = new FormData();
    formData.append("uuid", note.uuid!);
    formData.append("title", body.title ?? note.title ?? "");
    formData.append("content", body.content ?? note.content ?? "");
    formData.append("category", body.category ?? note.category ?? UNCATEGORIZED);

    const result = await editNote(user, formData);
    if (result.error) return refuse(result.error, 400);

    return NextResponse.json({
      success: true,
      data: {
        id: result.data?.uuid,
        title: result.data?.title,
        category: result.data?.category || UNCATEGORIZED,
        content: result.data?.content,
        createdAt: result.data?.createdAt,
        updatedAt: result.data?.updatedAt,
        owner: result.data?.owner,
      },
      ...(isManaged(note.extraMetadata) && { warning: MANAGED_WARNING }),
    });
  },
);

const PATCH_STATUS: Record<string, number> = {
  [SPLICE_MISSING]: 404,
  [SPLICE_DENIED]: 403,
};

export const PATCH = defineRoute(
  {
    id: "patchNote",
    method: HttpMethod.PATCH,
    path: "/notes/{noteId}",
    tag: ApiTag.NOTES,
    summary: "Replace one piece of a note",
    description:
      "Swaps the exact find text for replace without sending the whole note. find must appear exactly once, so include enough surrounding text to make it unique. It keeps the note's line endings and leaves everything else byte for byte. It refuses encrypted notes.",
    params: noteParams,
    body: notePatchBody,
    responses: {
      200: { description: "Patched", schema: warnedNote },
      400: ERRORS[400],
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
    },
  },
  async ({ request, user, params, body }) => {
    const uuid = await _noteUuid(request, params.noteId, user.username);
    if (!uuid) return refuse(NOT_FOUND, 404);

    const result = await spliceNote(user, uuid, (text) => findReplace(text, body.find, body.replace));
    if (!result.success || !result.data) {
      const error = result.error || "Failed to update note";
      return refuse(error, PATCH_STATUS[error] ?? 400);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.data.uuid,
        title: result.data.title,
        category: result.data.category,
        ...(result.data.managed && { managed: true }),
      },
      ...(result.data.managed && { warning: MANAGED_WARNING }),
    });
  },
);

export const DELETE = defineRoute(
  {
    id: "deleteNote",
    method: HttpMethod.DELETE,
    path: "/notes/{noteId}",
    tag: ApiTag.NOTES,
    summary: "Delete a note",
    params: noteParams,
    responses: {
      200: { description: "Deleted", schema: okSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params }) => {
    const { note, error } = await _ownNote(request, params.noteId, user.username);
    if (error) return refuse(error, 500);
    if (!note) return refuse(NOT_FOUND, 404);

    const formData = new FormData();
    formData.append("uuid", note.uuid!);

    const result = await dropNote(user, formData);
    if (result.error) return refuse(result.error, 400);

    return NextResponse.json({ success: true });
  },
);
