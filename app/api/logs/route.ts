import { NextResponse } from "next/server";
import { digUpLogs, everyUsername, sieveLogs } from "@/app/_server/actions/lib/audit-trail";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { logListQuery, logPageSchema } from "@/app/_schemas/api/logs";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "listLogs",
    method: HttpMethod.GET,
    path: "/logs",
    tag: ApiTag.LOGS,
    summary: "List audit log entries",
    description: "Newest first. You see your own entries. Admins see everybody's, or one user's with username.",
    query: logListQuery,
    responses: {
      200: { description: "A page of entries", schema: logPageSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      403: ERRORS[403],
      500: ERRORS[500],
    },
  },
  async ({ user, query }) => {
    if (!user.isAdmin && query.username && query.username !== user.username) {
      return refuse("Forbidden: You can only view your own logs", 403);
    }

    const usernames = user.isAdmin && !query.username
      ? await everyUsername()
      : [user.isAdmin && query.username ? query.username : user.username];

    const matches = sieveLogs(await digUpLogs(usernames, query), query);

    return NextResponse.json({
      success: true,
      logs: matches.slice(query.offset, query.offset + query.limit),
      total: matches.length,
    });
  },
);
