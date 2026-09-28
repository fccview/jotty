import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserNotes } from "@/app/_server/actions/note/queries";
import { makeNote } from "@/app/_server/actions/note/creator";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, envelope } from "@/app/_schemas/api/common";
import { noteCreateBody, noteListQuery, noteSchema } from "@/app/_schemas/api/notes";
import { UNCATEGORIZED } from "@/app/_consts/notes";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "listNotes",
    method: HttpMethod.GET,
    path: "/notes",
    tag: ApiTag.NOTES,
    summary: "List notes",
    description: "Every note the API key owner can read, including shared ones.",
    query: noteListQuery,
    responses: {
      200: { description: "Notes", schema: z.object({ notes: z.array(noteSchema) }) },
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
    const matches = notes.data.filter(
      (note) =>
        (!query.category || note.category === query.category) &&
        (!needle ||
          note.title?.toLowerCase().includes(needle) ||
          note.content?.toLowerCase().includes(needle)),
    );

    return NextResponse.json({
      notes: matches.map((note) => ({
        id: note.uuid,
        title: note.title,
        category: note.category || UNCATEGORIZED,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      })),
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
