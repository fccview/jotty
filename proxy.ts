import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isEnvEnabled, isDebugFlag } from "./app/_utils/env-utils";

const debugProxy = isDebugFlag("proxy");

const SESSION_CACHE_TTL = 10_000;
const sessionCache = new Map<string, { valid: boolean; ts: number }>();

const _checkSession = async (sessionId: string, internalApiUrl: string, cookie: string) => {
  const cached = sessionCache.get(sessionId);
  if (cached && Date.now() - cached.ts < SESSION_CACHE_TTL) return cached.valid;

  const sessionCheckUrl = new URL(`${internalApiUrl}/api/auth/check-session`);

  if (debugProxy) {
    console.log("MIDDLEWARE - Session Check URL:", sessionCheckUrl.href);
  }

  const res = await fetch(sessionCheckUrl, {
    headers: { Cookie: cookie },
    cache: "no-store",
  });

  if (debugProxy) {
    console.log("MIDDLEWARE - Session Check Response:");
    console.log("  status:", res.status);
    console.log("  statusText:", res.statusText);
    console.log("  ok:", res.ok);
  }

  sessionCache.set(sessionId, { valid: res.ok, ts: Date.now() });

  if (sessionCache.size > 1000) {
    const now = Date.now();
    sessionCache.forEach((val, key) => {
      if (now - val.ts > SESSION_CACHE_TTL) sessionCache.delete(key);
    });
  }

  return res.ok;
};

export const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/auth/check-session") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/public/")
  ) {
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    return response;
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const cookieName =
    process.env.NODE_ENV === "production" && isEnvEnabled(process.env.HTTPS)
      ? "__Host-session"
      : "session";
  const sessionId = request.cookies.get(cookieName)?.value;

  if (debugProxy) {
    console.log(
      "MIDDLEWARE - session cookie:",
      sessionId ? "present" : "absent",
    );
  }

  const appUrlBase = process.env.APP_URL
    ? process.env.APP_URL.replace(/\/$/, "")
    : request.nextUrl.origin;
  const loginUrl = new URL(`${appUrlBase}/auth/login`);

  if (!sessionId) {
    return NextResponse.redirect(loginUrl);
  }

  try {
    const internalApiUrl =
      process.env.INTERNAL_API_URL ||
      (process.env.APP_URL ? new URL(process.env.APP_URL).origin : null) ||
      request.nextUrl.origin;

    if (debugProxy) {
      console.log("MIDDLEWARE - URL Resolution:");
      console.log(
        "  INTERNAL_API_URL:",
        process.env.INTERNAL_API_URL || "(not set)",
      );
      console.log("  APP_URL:", process.env.APP_URL || "(not set)");
      console.log("  request.nextUrl.origin:", request.nextUrl.origin);
      console.log("  → Using:", internalApiUrl);
    }

    const valid = await _checkSession(
      sessionId,
      internalApiUrl,
      request.headers.get("Cookie") || "",
    );

    if (!valid) {
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.cookies.delete(cookieName);

      if (debugProxy) {
        console.log("MIDDLEWARE - session is not ok");
      }

      return redirectResponse;
    }
  } catch (error) {
    console.error("Session check error:", error);
  }

  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);
  return response;
};

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|site.webmanifest|sw.js|app-icons|app-screenshots|flags|fonts|images|repo-images|themes|openapi.yaml).*)",
  ],
};
