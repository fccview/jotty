import { NextResponse } from "next/server";
import { z } from "zod";
import { listTemplates } from "@/app/_server/actions/template/reader";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { templateSchema } from "@/app/_schemas/api/notes";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "listTemplates",
    method: HttpMethod.GET,
    path: "/templates",
    tag: ApiTag.NOTES,
    summary: "List note templates",
    description: "Your note templates. Pass a template's id as templateId to createNote to start a note from it. Templates are left out of listNotes and search.",
    responses: {
      200: { description: "Templates", schema: z.object({ templates: z.array(templateSchema) }) },
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user }) => {
    try {
      const templates = await listTemplates(user.username);
      return NextResponse.json({
        templates: templates.map(({ uuid, title, encrypted, updatedAt }) => ({
          id: uuid,
          title,
          ...(encrypted && { encrypted: true }),
          updatedAt,
        })),
      });
    } catch (error) {
      console.error("Error listing templates over the API:", error);
      return refuse("Failed to list templates", 500);
    }
  },
);
