import { NextResponse } from "next/server";
import { defineRoute } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { fromHtmlBody, fromHtmlSchema } from "@/app/_schemas/api/markdown";
import { htmlToMarkdown } from "@/app/_server/actions/markdown/from-html";

export const dynamic = "force-dynamic";

export const POST = defineRoute(
  {
    id: "markdownFromHtml",
    method: HttpMethod.POST,
    path: "/markdown/from-html",
    tag: ApiTag.NOTES,
    summary: "Convert HTML to markdown",
    description:
      "Runs HTML through the note editor's own schema and serializer, so the markdown is what the editor would save if that HTML had been put in a note. Nothing is written. Relative links and images are resolved against baseUrl when it is given. html over 5 MB is refused with 400.",
    body: fromHtmlBody,
    responses: {
      200: { description: "Converted markdown", schema: fromHtmlSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user, body }) => {
    const markdown = await htmlToMarkdown({ ...body, tableSyntax: user.tableSyntax });
    return NextResponse.json({ success: true, data: { markdown } });
  },
);
