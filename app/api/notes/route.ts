import { NextResponse } from "next/server";
import { z } from "zod";
import { apiNoteListing } from "@/app/_server/actions/note/api-listing";
import { makeNote } from "@/app/_server/actions/note/creator";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, envelope, totalField } from "@/app/_schemas/api/common";
import { toApiNote } from "@/app/_utils/api-note";
import { noteCreateBody, noteListQuery, noteSchema } from "@/app/_schemas/api/notes";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { TEMPLATE_ID_FIELD } from "@/app/_consts/templates";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "listNotes",
    method: HttpMethod.GET,
    path: "/notes",
    tag: ApiTag.NOTES,
    summary: "List notes",
    description: "Every note the API key owner can read, including shared ones. Use view=summary with limit and offset to page through titles and excerpts without loading every note's content. Pass tag to list the notes carrying a tag, and use getNotes to read several known notes in one call.",
    query: noteListQuery,
    responses: {
      200: { description: "Notes", schema: z.object({ notes: z.array(noteSchema), total: totalField }) },
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user, query }) => {
    const listed = await apiNoteListing(user.username, query);
    if (!listed.success || !listed.data) {
      return refuse(listed.error || "Failed to fetch notes", 500);
    }

    return NextResponse.json({
      notes: listed.data.notes.map((note) => toApiNote(note, query.view)),
      total: listed.data.total,
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
    if (body.templateId) formData.append(TEMPLATE_ID_FIELD, body.templateId);

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
