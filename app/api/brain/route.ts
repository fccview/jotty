import { NextResponse } from "next/server";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { LINK_KINDS_TEXT, brainQuery, brainSchema } from "@/app/_schemas/api/relations";
import { neighbourhoodFor } from "@/app/_server/actions/relations/explore";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "getBrain",
    method: HttpMethod.GET,
    path: "/brain",
    tag: ApiTag.RELATIONS,
    summary: "A slice of the link map",
    description:
      `With focus, the items up to depth links away from it, nearest first. Without it, the most linked items. Tags are the #hashtags in an item's content, listed on each node rather than drawn as nodes. Every edge carries a kind, and suggested marks a likely link when suggestions is on. ${LINK_KINDS_TEXT}.`,
    query: brainQuery,
    responses: {
      200: { description: "Nodes and the links between them", schema: brainSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ user, query }) => {
    const result = await neighbourhoodFor(user, query);
    if (!result.success) return refuse(result.error || "Not found", 404);
    return NextResponse.json(result.data);
  },
);
