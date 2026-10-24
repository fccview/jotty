import { NextResponse } from "next/server";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { noteParams, noteTagBody } from "@/app/_schemas/api/notes";
import { taggedNoteSchema } from "@/app/_schemas/api/tags";
import { MANAGED_WARNING, isManaged } from "@/app/_consts/notes";
import { isUuid } from "@/app/_consts/identity";
import { getNoteById } from "@/app/_server/actions/note/queries";
import {
  SPLICE_DENIED,
  SPLICE_MISSING,
  SPLICE_UNCHANGED,
  spliceNote,
} from "@/app/_server/actions/note/splice";
import { TAG_INVALID, addHashtags, cleanTag, dropHashtags } from "@/app/_utils/note-edits";

export const dynamic = "force-dynamic";

const NOT_FOUND = "Note not found";

const STATUS: Record<string, number> = {
  [SPLICE_MISSING]: 404,
  [SPLICE_DENIED]: 403,
};

const _cleaned = (tags: string[] = []) => {
  const names = tags.map(cleanTag);
  const bad = tags.filter((_, index) => !names[index]);
  return { names: names.filter((name): name is string => Boolean(name)), bad };
};

const _unchanged = async (uuid: string, username: string) => {
  const note = await getNoteById(uuid, username);
  if (!note) return refuse(NOT_FOUND, 404);
  return NextResponse.json({
    success: true,
    data: { id: uuid, title: note.title, tags: note.tags || [], changed: false },
    ...(isManaged(note.extraMetadata) && { warning: MANAGED_WARNING }),
  });
};

export const POST = defineRoute(
  {
    id: "tagNote",
    method: HttpMethod.POST,
    path: "/notes/{noteId}/tags",
    tag: ApiTag.NOTES,
    summary: "Add or remove a note's tags",
    description:
      "Tags are #hashtags in the note's content. add appends the missing ones on a tag line at the end, remove deletes those #hashtags wherever they sit outside code. Nothing else in the note changes, so you don't resend its content. It refuses encrypted notes.",
    params: noteParams,
    body: noteTagBody,
    responses: {
      200: { description: "The note's tags afterwards", schema: taggedNoteSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
    },
  },
  async ({ user, params, body }) => {
    if (!isUuid(params.noteId)) return refuse(NOT_FOUND, 404);
    const add = _cleaned(body.add);
    const remove = _cleaned(body.remove);
    const bad = [...add.bad, ...remove.bad];
    if (bad.length) return refuse(`${TAG_INVALID}: ${bad.join(", ")}`, 400);

    const result = await spliceNote(
      user,
      params.noteId,
      (text) => ({ body: addHashtags(dropHashtags(text, remove.names), add.names) }),
      { untag: remove.names },
    );

    if (result.error === SPLICE_UNCHANGED) return _unchanged(params.noteId, user.username);
    if (!result.success || !result.data) {
      const error = result.error || "Failed to tag note";
      return refuse(error, STATUS[error] ?? 400);
    }

    return NextResponse.json({
      success: true,
      data: { id: result.data.uuid, title: result.data.title, tags: result.data.tags, changed: true },
      ...(result.data.managed && { warning: MANAGED_WARNING }),
    });
  },
);
