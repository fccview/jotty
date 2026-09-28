import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessions } from "@/app/_server/actions/session/store";
import { getSessionCookieName } from "@/app/_utils/env-utils";

type Session = Record<string, string>;

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(getSessionCookieName())?.value;

    if (!sessionId) {
      return new NextResponse(JSON.stringify({ error: "No session cookie" }), {
        status: 401,
      });
    }

    const sessions: Session = await readSessions();

    if (sessions && sessions[sessionId]) {
      return new NextResponse(
        JSON.stringify({ success: true, username: sessions[sessionId] }),
        { status: 200 },
      );
    } else {
      return new NextResponse(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
      });
    }
  } catch (error) {
    console.error("Session check API error:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 },
    );
  }
}
