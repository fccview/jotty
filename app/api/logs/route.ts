import { NextRequest, NextResponse } from "next/server";
import { getAuditLogs } from "@/app/_server/actions/log";
import { isAuthenticated } from "@/app/_server/actions/users";

export const dynamic = "force-dynamic";

export const GET = async (request: NextRequest) => {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;

    const filters = {
      username: searchParams.get("username") || undefined,
      action: searchParams.get("action") as any,
      category: searchParams.get("category") as any,
      level: searchParams.get("level") as any,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      success:
        searchParams.get("success") === "true"
          ? true
          : searchParams.get("success") === "false"
            ? false
            : undefined,
      limit: parseInt(searchParams.get("limit") || "50"),
      offset: parseInt(searchParams.get("offset") || "0"),
    };

    const result = await getAuditLogs(filters);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
};
