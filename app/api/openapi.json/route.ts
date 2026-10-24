import { NextResponse } from "next/server";
import { z } from "zod";
import { defineRoute } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { apiSpec } from "@/app/_server/api/spec";
import { ERRORS } from "@/app/_schemas/api/common";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "getOpenApiSpec",
    method: HttpMethod.GET,
    path: "/openapi.json",
    tag: ApiTag.SYSTEM,
    summary: "Get the OpenAPI document",
    description: "Built from the route contracts, so it matches the version this instance runs.",
    responses: {
      200: { description: "OpenAPI 3.1 document", schema: z.record(z.string(), z.unknown()) },
      401: ERRORS[401],
    },
  },
  async ({ request }) => NextResponse.json(await apiSpec(request.nextUrl.origin)),
);
