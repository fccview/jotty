import { NextResponse } from "next/server";
import { defineRoute } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, page } from "@/app/_schemas/api/common";
import { sharesQuery, sharesSchema } from "@/app/_schemas/api/relations";
import { sharesFor } from "@/app/_server/actions/share/listing";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "listShares",
    method: HttpMethod.GET,
    path: "/shares",
    tag: ApiTag.SHARING,
    summary: "What you shared and what was shared with you",
    description:
      "withMe lists items other people shared with you and what you can do with each. byMe lists your shared items, who holds them and whether they're public. Read only.",
    query: sharesQuery,
    responses: {
      200: { description: "Shares", schema: sharesSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user, query }) => {
    const shares = await sharesFor(user, query);
    return NextResponse.json({ shares: page(shares, query), total: shares.length });
  },
);
