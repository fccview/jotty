import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(request: NextRequest) {
  if (process.env.ENABLE_API_DOCS !== "true") {
    return NextResponse.json(
      { error: "API docs not enabled" },
      { status: 404 }
    );
  }

  try {
    const specPath = path.join(process.cwd(), "public", "openapi.yaml");
    const specContent = fs.readFileSync(specPath, "utf8");
    const spec = yaml.load(specContent) as any;

    const baseUrl = request.nextUrl.origin;

    spec.servers = [
      {
        url: `${baseUrl}/api`,
        description:
          process.env.NODE_ENV === "production"
            ? "Production server"
            : "Development server",
      },
    ];

    const accept = request.headers.get("accept");
    const format =
      request.nextUrl.searchParams.get("format") ||
      (accept?.includes("application/yaml") || accept?.includes("text/yaml")
        ? "yaml"
        : "json");

    if (format === "yaml") {
      return new NextResponse(yaml.dump(spec), {
        headers: {
          "Content-Type": "application/yaml",
          "Cache-Control": "public, max-age=300",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    return NextResponse.json(spec, {
      headers: {
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Failed to load API spec:", error);
    return NextResponse.json(
      { error: "Failed to load API spec" },
      { status: 500 }
    );
  }
}
