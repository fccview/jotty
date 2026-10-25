import { NextResponse } from "next/server";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, errorSchema } from "@/app/_schemas/api/common";
import { HTML_BODY_LIMIT, fromHtmlBody, fromHtmlSchema } from "@/app/_schemas/api/markdown";
import { ScribeRefusal, transcribe } from "@/app/_server/actions/markdown/scribe";

export const dynamic = "force-dynamic";

const refusals: Record<ScribeRefusal, { message: string; status: number }> = {
  [ScribeRefusal.BUSY]: { message: "Too many conversions running, try again shortly", status: 503 },
  [ScribeRefusal.TOO_HEAVY]: { message: "html is too large or complex to convert", status: 422 },
};

export const POST = defineRoute(
  {
    id: "markdownFromHtml",
    method: HttpMethod.POST,
    path: "/markdown/from-html",
    tag: ApiTag.NOTES,
    summary: "Convert HTML to markdown",
    description:
      "Runs HTML through the note editor's own schema and serializer, so the markdown is what the editor would save if that HTML had been put in a note. Nothing is written. Relative links and images are resolved against baseUrl when it is given. html over 5 MB is refused with 400, HTML that takes too long or too much memory to convert with 422, and 503 means other conversions are queued ahead of yours.",
    body: fromHtmlBody,
    bodyLimit: HTML_BODY_LIMIT,
    responses: {
      200: { description: "Converted markdown", schema: fromHtmlSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      413: { description: "Request body is too large", schema: errorSchema },
      422: { description: "HTML too large or complex to convert", schema: errorSchema },
      500: ERRORS[500],
      503: { description: "Too many conversions queued, try again shortly", schema: errorSchema },
    },
  },
  async ({ user, body }) => {
    const result = await transcribe({ ...body, tableSyntax: user.tableSyntax });
    if ("refusal" in result) {
      const { message, status } = refusals[result.refusal];
      return refuse(message, status);
    }
    return NextResponse.json({ success: true, data: { markdown: result.markdown } });
  },
);
