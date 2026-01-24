import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export const dynamic = "force-dynamic";

function resolveFileRef(obj: unknown, baseDir: string): unknown {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => resolveFileRef(item, baseDir));
  }

  const record = obj as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (key === "$ref" && typeof value === "string" && value.startsWith("./")) {
      const refPath = path.resolve(baseDir, value);
      if (fs.existsSync(refPath)) {
        const content = fs.readFileSync(refPath, "utf8");
        const loaded = yaml.load(content) as unknown;
        const resolved = resolveFileRef(loaded, path.dirname(refPath));
        if (typeof resolved === "object" && resolved !== null && !Array.isArray(resolved)) {
          Object.assign(result, resolved);
        } else {
          return resolved;
        }
      }
    } else {
      result[key] = resolveFileRef(value, baseDir);
    }
  }

  return result;
}

function mergePaths(spec: Record<string, unknown>): Record<string, unknown> {
  if (!spec.paths || typeof spec.paths !== "object") {
    return spec;
  }

  const pathFiles = [
    "./api/paths/health.yaml",
    "./api/paths/checklists.yaml",
    "./api/paths/notes.yaml",
    "./api/paths/tasks.yaml",
    "./api/paths/users.yaml",
    "./api/paths/categories.yaml",
    "./api/paths/summary.yaml",
    "./api/paths/exports.yaml",
    "./api/paths/admin.yaml",
    "./api/paths/logs.yaml",
  ];

  const publicDir = path.join(process.cwd(), "public");
  const mergedPaths: Record<string, unknown> = {};

  for (const filePath of pathFiles) {
    const fullPath = path.join(publicDir, filePath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      const loaded = yaml.load(content) as Record<string, unknown>;
      Object.assign(mergedPaths, loaded);
    }
  }

  spec.paths = mergedPaths;
  return spec;
}

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
    let spec = yaml.load(specContent) as Record<string, unknown>;

    const publicDir = path.dirname(specPath);
    spec = resolveFileRef(spec, publicDir) as Record<string, unknown>;
    spec = mergePaths(spec);

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
