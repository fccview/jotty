import { NextResponse } from "next/server";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, sliceQuery } from "@/app/_schemas/api/common";
import { docParams, docSchema } from "@/app/_schemas/api/howto";
import { readHowto } from "@/app/_server/actions/lib/howto-docs";
import { sliceText } from "@/app/_utils/text-slice";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "readDoc",
    method: HttpMethod.GET,
    path: "/howto/{docId}",
    tag: ApiTag.DISCOVERY,
    summary: "Read a how-to guide",
    description:
      "Returns one guide as markdown. Use offset and limit to read a long guide in parts.",
    params: docParams,
    query: sliceQuery,
    responses: {
      200: { description: "The guide", schema: docSchema },
      401: ERRORS[401],
      404: ERRORS[404],
    },
  },
  async ({ params, query }) => {
    const doc = await readHowto(params.docId);
    if (!doc) return refuse("Guide not found", 404);
    return NextResponse.json({ id: doc.id, title: doc.title, ...sliceText(doc.content, query.offset, query.limit) });
  },
);
