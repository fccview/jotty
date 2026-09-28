import { NextResponse } from "next/server";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { orphansQuery, orphansSchema } from "@/app/_schemas/api/relations";
import { orphansFor } from "@/app/_server/actions/relations/explore";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "listOrphans",
    method: HttpMethod.GET,
    path: "/relations/orphans",
    tag: ApiTag.RELATIONS,
    summary: "Items with no links",
    description: "Notes and checklists that link to nothing and that nothing links to. Tags don't count as links.",
    query: orphansQuery,
    responses: {
      200: { description: "Unlinked items, by title", schema: orphansSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ user, query }) => {
    const result = await orphansFor(user, query);
    if (!result.success) return refuse(result.error || "Not found", 404);
    return NextResponse.json(result.data);
  },
);
