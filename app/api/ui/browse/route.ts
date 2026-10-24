import { NextRequest, NextResponse } from "next/server";
import { BrowseOps } from "@/app/_consts/ui-api";
import { browseFor } from "@/app/_server/actions/browse/page";

export const dynamic = "force-dynamic";

export const POST = async (request: NextRequest) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || body.op !== BrowseOps.PAGE) {
    return NextResponse.json({ success: false, error: "Invalid browse request" }, { status: 400 });
  }

  const result = await browseFor(body.scope, body.query);
  const status = result.success ? 200 : result.error === "Not authenticated" ? 401 : 400;
  return NextResponse.json(result, { status });
};
