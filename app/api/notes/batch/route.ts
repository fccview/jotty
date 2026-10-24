import { NextResponse } from "next/server";
import { getUserNotes } from "@/app/_server/actions/note/queries";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { noteBatchQuery, noteBatchSchema, noteIdList } from "@/app/_schemas/api/notes";
import { toApiNote } from "@/app/_utils/api-note";
import type { Note } from "@/app/_types";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "getNotes",
    method: HttpMethod.GET,
    path: "/notes/batch",
    tag: ApiTag.NOTES,
    summary: "Get several notes",
    description:
      "Reads the notes with the given uuids in one call, each with its whole content and contentLength. Ids that match no note you can read come back in missing instead of failing the call. For one very long note, getNote reads it in slices.",
    query: noteBatchQuery,
    responses: {
      200: { description: "The notes found and the ids that weren't", schema: noteBatchSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user, query }) => {
    const notes = await getUserNotes({ username: user.username });
    if (!notes.success || !notes.data) {
      return refuse(notes.error || "Failed to fetch notes", 500);
    }

    const byUuid = new Map<string, Partial<Note>>();
    notes.data.forEach((note) => {
      if (note.uuid) byUuid.set(note.uuid.toLowerCase(), note);
    });

    const asked = noteIdList(query.ids);
    const found = asked.flatMap((id) => byUuid.get(id) ?? []);

    return NextResponse.json({
      notes: found.map((note) => ({
        ...toApiNote(note),
        contentLength: (note.content ?? "").length,
      })),
      missing: asked.filter((id) => !byUuid.has(id)),
    });
  },
);
