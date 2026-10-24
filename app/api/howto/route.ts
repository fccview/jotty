import { NextResponse } from "next/server";
import { defineRoute } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { docListSchema } from "@/app/_schemas/api/howto";
import { listHowtos } from "@/app/_server/actions/lib/howto-docs";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "listDocs",
    method: HttpMethod.GET,
    path: "/howto",
    tag: ApiTag.DISCOVERY,
    summary: "List the how-to guides",
    description:
      "The guides this instance ships, the same ones as the How To pages in the app. Read one with readDoc.",
    responses: {
      200: { description: "Guides", schema: docListSchema },
      401: ERRORS[401],
    },
  },
  async () => {
    const docs = await listHowtos();
    return NextResponse.json({ docs, total: docs.length });
  },
);
