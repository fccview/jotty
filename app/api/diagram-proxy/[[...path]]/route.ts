import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getSettings } from "@/app/_server/actions/config";
import { DEFAULT_DRAWIO_URL, DIAGRAM_PROXY_PATH } from "@/app/_consts/diagrams";
import { buildDrawioTarget } from "@/app/_utils/drawio-proxy-utils";

export const dynamic = "force-dynamic";

const FORWARDED_REQUEST_HEADERS = ["accept", "accept-language", "cache-control", "content-type", "user-agent"];
const FORWARDED_RESPONSE_HEADERS = ["content-type", "cache-control", "expires", "last-modified", "etag"];
const BODY_METHODS = new Set(["POST", "PUT"]);
const HTML_TYPE = "text/html";
const PROXY_PREFIX = `${DIAGRAM_PROXY_PATH}/`;
const ROOT_RELATIVE_ATTR = /(src|href|action|data|content)\s*=\s*["']\/([^"'\s>]+)["']/gi;

const rewriteHtml = (html: string) =>
  html
    .replace(/<head[^>]*>/i, (match) => `${match}<base href="${PROXY_PREFIX}">`)
    .replace(ROOT_RELATIVE_ATTR, (match, attr: string, path: string) =>
      path.startsWith(PROXY_PREFIX.slice(1)) || path.startsWith("/") ? match : `${attr}="${PROXY_PREFIX}${path}"`,
    );

const proxyDrawioRequest = async (request: NextRequest, segments: string[]) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const settings = await getSettings();
    if (!settings?.editor?.drawioProxyEnabled) {
      return new NextResponse("Draw.io proxy is not enabled", { status: 403 });
    }

    const target = buildDrawioTarget(
      settings.editor.drawioUrl || DEFAULT_DRAWIO_URL,
      segments,
      new URL(request.url).search,
    );
    if (!target) {
      return new NextResponse("Invalid draw.io path", { status: 400 });
    }

    const headers = new Headers();
    FORWARDED_REQUEST_HEADERS.forEach((name) => {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    });

    const response = await fetch(target, {
      method: request.method,
      headers,
      body: BODY_METHODS.has(request.method) ? await request.text() : undefined,
    });

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes(HTML_TYPE)
      ? rewriteHtml(await response.text())
      : await response.arrayBuffer();

    const responseHeaders = new Headers();
    FORWARDED_RESPONSE_HEADERS.forEach((name) => {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    });

    return new NextResponse(body, { status: response.status, headers: responseHeaders });
  } catch (error) {
    console.error("Draw.io proxy error:", error);
    return new NextResponse("Failed to proxy Draw.io request", { status: 502 });
  }
};

export const GET = async (request: NextRequest, props: { params: Promise<{ path?: string[] }> }) => {
  const { path = [] } = await props.params;
  return proxyDrawioRequest(request, path);
};

export const POST = async (request: NextRequest, props: { params: Promise<{ path?: string[] }> }) => {
  const { path = [] } = await props.params;
  return proxyDrawioRequest(request, path);
};
