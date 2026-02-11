import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isEnvEnabled } from "./app/_utils/env-utils";

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

  if (isEnvEnabled(process.env.DEBUGGER)) {
    console.log("MIDDLEWARE - sessionId:", sessionId);
    console.log("MIDDLEWARE - cookies:", request.cookies.getAll());
  }

  const loginUrl = new URL("/auth/login", request.url);

  if (!sessionId) {
    return NextResponse.redirect(loginUrl);
  }

  try {
    const internalApiUrl =
      process.env.INTERNAL_API_URL ||
      process.env.APP_URL ||
      request.nextUrl.origin;

    if (isEnvEnabled(process.env.DEBUGGER)) {
      console.log("MIDDLEWARE - URL Resolution:");
      console.log(
        "  INTERNAL_API_URL:",
        process.env.INTERNAL_API_URL || "(not set)",
      );
      console.log("  APP_URL:", process.env.APP_URL || "(not set)");
      console.log("  request.nextUrl.origin:", request.nextUrl.origin);
      console.log("  → Using:", internalApiUrl);
    }

    const sessionCheckUrl = new URL(`${internalApiUrl}/api/auth/check-session`);

    if (isEnvEnabled(process.env.DEBUGGER)) {
      console.log("MIDDLEWARE - Session Check URL:", sessionCheckUrl.href);
    }

    const sessionCheck = await fetch(sessionCheckUrl, {
      headers: {
        Cookie: request.headers.get("Cookie") || "",
      },
      cache: "no-store",
    });

    if (isEnvEnabled(process.env.DEBUGGER)) {
      console.log("MIDDLEWARE - Session Check Response:");
      console.log("  status:", sessionCheck.status);
      console.log("  statusText:", sessionCheck.statusText);
      console.log("  ok:", sessionCheck.ok);
    }

    if (!sessionCheck.ok) {
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.cookies.delete(cookieName);

      if (isEnvEnabled(process.env.DEBUGGER)) {
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
    "/((?!_next/static|_next/image|favicon.ico|site.webmanifest|sw.js|app-icons).*)",
  ],
};
