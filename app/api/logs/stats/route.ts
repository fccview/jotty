import { NextRequest, NextResponse } from "next/server";
import { getAuditLogStats } from "@/app/_server/actions/log";
import { isAdmin } from "@/app/_server/actions/users";

export const dynamic = "force-dynamic";

export const GET = async (request: NextRequest) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const stats = await getAuditLogStats();

    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
};
