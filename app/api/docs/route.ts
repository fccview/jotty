import { NextResponse } from "next/server";
import yaml from "js-yaml";
import { z } from "zod";
import { isEnvEnabled } from "@/app/_utils/env-utils";
import { definePublicRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod, MediaType } from "@/app/_server/api/contract";
import { apiSpec } from "@/app/_server/api/spec";
import { ERRORS } from "@/app/_schemas/api/common";

export const dynamic = "force-dynamic";

enum SpecFormat {
  JSON = "json",
  YAML = "yaml",
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SPEC_HEADERS = { ...CORS_HEADERS, "Cache-Control": "public, max-age=300" };

const _wantsYaml = (format: string | undefined, accept: string | null) =>
  format
    ? format === SpecFormat.YAML
    : Boolean(accept?.includes(MediaType.YAML) || accept?.includes("text/yaml"));

export const OPTIONS = async () =>
  new NextResponse(null, { status: 200, headers: CORS_HEADERS });

export const GET = definePublicRoute(
  {
    id: "getPublicApiDocs",
    method: HttpMethod.GET,
    path: "/docs",
    tag: ApiTag.SYSTEM,
    summary: "Get the public OpenAPI document",
    description: "The same document as /openapi.json without an API key, for viewers such as Redoc. Answers 404 unless ENABLE_API_DOCS=true.",
    query: z.object({
      format: z.enum(SpecFormat).optional().describe("Defaults to JSON, or YAML when the Accept header asks for it"),
    }),
    responses: {
      200: { description: "OpenAPI 3.1 document", schema: z.record(z.string(), z.unknown()) },
      404: { description: "API docs are disabled on this instance", schema: ERRORS[404].schema },
    },
  },
  async ({ request, query }) => {
    if (!isEnvEnabled(process.env.ENABLE_API_DOCS)) {
      return refuse("API docs not enabled", 404);
    }

    const spec = await apiSpec(request.nextUrl.origin);

    if (_wantsYaml(query.format, request.headers.get("accept"))) {
      return new NextResponse(yaml.dump(spec, { noRefs: true }), {
        headers: { ...SPEC_HEADERS, "Content-Type": MediaType.YAML },
      });
    }

    return NextResponse.json(spec, { headers: SPEC_HEADERS });
  },
);
