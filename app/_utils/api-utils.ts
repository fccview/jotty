import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/app/_server/actions/api";
import { resolveApiId } from "@/app/_server/lib/legacy-lookup";
import { Modes } from "@/app/_types/enums";

/**
 * @deprecated Legacy category+id fallback for checklist-family API routes
 * (checklists, tasks, kanban). Returns the param when it is already a uuid,
 * otherwise resolves it via the deprecated category+slug lookup, which logs a
 * WARNING on every use. Will be removed once slug lookups are dropped.
 */
export const listUuid = async (
  request: NextRequest,
  param: string,
  username: string
): Promise<string | null> =>
  resolveApiId(
    Modes.CHECKLISTS,
    param,
    request.nextUrl.searchParams.get("category"),
    username
  );

export const withApiAuth = async (
  request: NextRequest,
  handler: (user: any, request: NextRequest) => Promise<NextResponse>
) => {
  try {
    const apiKey = request.headers.get("x-api-key");
    const user = await authenticateApiKey(apiKey || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handler(user, request);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

