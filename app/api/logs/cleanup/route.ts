import { NextRequest, NextResponse } from "next/server";
import { cleanupOldLogs } from "@/app/_server/actions/log";
import { withApiAuth } from "@/app/_utils/api-utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withApiAuth(request, async (user) => {
    try {
      if (!user.isAdmin) {
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
  });
}
