import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserNotes } from "@/app/_server/actions/note/queries";
import { makeNote } from "@/app/_server/actions/note/creator";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, envelope, page, totalField } from "@/app/_schemas/api/common";
import { toApiNote } from "@/app/_utils/api-note";
import { tagMatchesFilter } from "@/app/_utils/tag-utils";
import { noteCreateBody, noteListQuery, noteSchema } from "@/app/_schemas/api/notes";
import { UNCATEGORIZED } from "@/app/_consts/notes";

export const dynamic = "force-dynamic";

const _idSet = (ids?: string): Set<string> | null => {
  const list = (ids || "").split(",").map((id) => id.trim().toLowerCase()).filter(Boolean);
  return list.length ? new Set(list) : null;
};

export const GET = defineRoute(
  {
    id: "listNotes",
    method: HttpMethod.GET,
    path: "/notes",
    tag: ApiTag.NOTES,
    summary: "List notes",
    description: "Every note the API key owner can read, including shared ones. Use view=summary with limit and offset to page through titles and excerpts without loading every note's content. Pass ids to read several known notes in one call, and tag to list the notes carrying a tag.",
    query: noteListQuery,
    responses: {
      200: { description: "Notes", schema: z.object({ notes: z.array(noteSchema), total: totalField }) },
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user, query }) => {
    const notes = await getUserNotes({ username: user.username });
    if (!notes.success || !notes.data) {
      return refuse(notes.error || "Failed to fetch notes", 500);
    }

    const needle = query.q?.toLowerCase();
    const wanted = _idSet(query.ids);
    const matches = notes.data.filter(
      (note) =>
        (!query.category || note.category === query.category) &&
        (!wanted || wanted.has((note.uuid || "").toLowerCase())) &&
        (!query.tag || (note.tags || []).some((tag) => tagMatchesFilter(tag, query.tag!))) &&
        (!needle ||
          note.title?.toLowerCase().includes(needle) ||
          note.content?.toLowerCase().includes(needle)),
    );

    return NextResponse.json({
      notes: page(matches, query).map((note) => toApiNote(note, query.view)),
      total: matches.length,
    });
  },
);

export const POST = defineRoute(
  {
    id: "createNote",
    method: HttpMethod.POST,
    path: "/notes",
    tag: ApiTag.NOTES,
    summary: "Create a note",
    body: noteCreateBody,
    responses: {
      200: { description: "Created note", schema: envelope(noteSchema) },
      400: ERRORS[400],
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user, body }) => {
    const formData = new FormData();
    formData.append("title", body.title);
    formData.append("rawContent", body.content);
    formData.append("category", body.category);

    const result = await makeNote(user, formData);
    if (result.error) return refuse(result.error, 400);

    return NextResponse.json({
      success: true,
      data: {
        id: result.data?.uuid,
        title: result.data?.title,
        category: result.data?.category || UNCATEGORIZED,
        content: result.data?.content || body.content,
        createdAt: result.data?.createdAt,
        updatedAt: result.data?.updatedAt,
        owner: result.data?.owner,
      },
    });
  },
);
