import { NextRequest, NextResponse } from "next/server";
import { SidebarOps } from "@/app/_consts/ui-api";
import { getSidebarRows, locateSidebarItem, searchSidebar } from "@/app/_server/actions/sidebar";

export const dynamic = "force-dynamic";

const NOT_ALLOWED = { success: false, error: "Not authenticated" };

export const POST = async (request: NextRequest) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Invalid sidebar request" }, { status: 400 });
  }

  const result =
    body.op === SidebarOps.ROWS
      ? await getSidebarRows(body.mode, body.category, body.offset, String(body.stamp || ""))
      : body.op === SidebarOps.LOCATE
        ? await locateSidebarItem(body.mode, body.uuid)
        : body.op === SidebarOps.SEARCH
          ? await searchSidebar(body.mode, body.query, String(body.stamp || ""))
          : { success: false, error: "Unknown sidebar request" };

  const status = result.success ? 200 : result.error === NOT_ALLOWED.error ? 401 : 400;
  return NextResponse.json(result, { status });
};
