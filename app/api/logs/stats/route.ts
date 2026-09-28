import { NextResponse } from "next/server";
import { digUpLogs, everyUsername, newestFirst } from "@/app/_server/actions/lib/audit-trail";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { logStatsSchema } from "@/app/_schemas/api/logs";
import { AUDIT_LOG_LEVELS } from "@/app/_types/audit";
import { LOG_WINDOW_DAYS } from "@/app/_consts/logs";

export const dynamic = "force-dynamic";

const TOP_COUNT = 10;

const _bump = (counts: Map<string, number>, key: string) =>
  counts.set(key, (counts.get(key) || 0) + 1);

const _top = (counts: Map<string, number>) =>
  Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_COUNT);

export const GET = defineRoute(
  {
    id: "getLogStats",
    method: HttpMethod.GET,
    path: "/logs/stats",
    tag: ApiTag.LOGS,
    summary: "Get audit log statistics",
    description: `Admin only. Totals per level and category, the busiest actions and users, and the latest entries, across every user for the last ${LOG_WINDOW_DAYS} days.`,
    responses: {
      200: { description: "Statistics", schema: logStatsSchema },
      401: ERRORS[401],
      403: ERRORS[403],
      500: ERRORS[500],
    },
  },
  async ({ user }) => {
    if (!user.isAdmin) return refuse("Admin access required", 403);

    const logs = await digUpLogs(await everyUsername());
    const levels = new Map<string, number>(AUDIT_LOG_LEVELS.map((level) => [level, 0]));
    const categories = new Map<string, number>();
    const actions = new Map<string, number>();
    const users = new Map<string, number>();

    logs.forEach((log) => {
      _bump(levels, log.level);
      _bump(categories, log.category);
      _bump(actions, log.action);
      _bump(users, log.username);
    });

    return NextResponse.json({
      totalLogs: logs.length,
      logsByLevel: Object.fromEntries(levels),
      logsByCategory: Object.fromEntries(categories),
      topActions: _top(actions).map(([action, count]) => ({ action, count })),
      topUsers: _top(users).map(([username, count]) => ({ username, count })),
      recentActivity: newestFirst(logs).slice(0, TOP_COUNT),
    });
  },
);
