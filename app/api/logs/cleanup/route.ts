import { NextRequest, NextResponse } from "next/server";
import { cleanupOldLogs } from "@/app/_server/actions/log";
import { isAdmin } from "@/app/_server/actions/users";

export const dynamic = "force-dynamic";

export const POST = async (request: NextRequest) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const result = await cleanupOldLogs();

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Cleanup failed" },
      { status: 500 }
    );
  }
};
