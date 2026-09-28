import { NextResponse } from "next/server";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { relatedParams, relatedSchema } from "@/app/_schemas/api/relations";
import { relatedFor } from "@/app/_server/actions/relations/explore";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "getRelated",
    method: HttpMethod.GET,
    path: "/relations/{itemId}",
    tag: ApiTag.RELATIONS,
    summary: "What an item links to and what links to it",
    description:
      "Backlinks, outgoing links, wikilinks to notes nobody has written, notes that name the item without linking it, and items that are probably related. Titles only, fetch an item to read it.",
    params: relatedParams,
    responses: {
      200: { description: "The item's links", schema: relatedSchema },
      401: ERRORS[401],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ user, params }) => {
    const result = await relatedFor(user, params.itemId);
    if (!result.success) return refuse(result.error || "Not found", 404);
    return NextResponse.json(result.data);
  },
);
