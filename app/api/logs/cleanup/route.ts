import { NextResponse } from "next/server";
import { sweepOldLogs } from "@/app/_server/actions/log/sweep";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { cleanupSchema } from "@/app/_schemas/api/logs";

export const dynamic = "force-dynamic";

export const POST = defineRoute(
  {
    id: "cleanupLogs",
    method: HttpMethod.POST,
    path: "/logs/cleanup",
    tag: ApiTag.LOGS,
    summary: "Delete old audit logs",
    description: "Admin only. Deletes log files older than the instance's retention setting. Does nothing when retention is unlimited.",
    responses: {
      200: { description: "Cleanup result", schema: cleanupSchema },
      401: ERRORS[401],
      403: ERRORS[403],
      500: ERRORS[500],
    },
  },
  async ({ user }) => {
    if (!user.isAdmin) return refuse("Admin access required", 403);
    return NextResponse.json(await sweepOldLogs());
  },
);
