import { NextRequest, NextResponse } from "next/server";
import { exportAuditLogs } from "@/app/_server/actions/log";
import { isAuthenticated } from "@/app/_server/actions/users";

export const dynamic = "force-dynamic";

export const POST = async (request: NextRequest) => {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { format, filters } = body;

    if (!format || !["json", "csv"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Must be 'json' or 'csv'" },
        { status: 400 }
      );
    }

    const result = await exportAuditLogs(format, filters || {});

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const contentType = format === "json" ? "application/json" : "text/csv";
    const filename = `audit-logs-${Date.now()}.${format}`;

    return new NextResponse(result.data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Export failed" },
      { status: 500 }
    );
  }
};
