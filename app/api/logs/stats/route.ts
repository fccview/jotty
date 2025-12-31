import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getDailyLogPath, getDateRange } from "@/app/_server/actions/log";
import { readJsonFile } from "@/app/_server/actions/file";
import { USERS_FILE } from "@/app/_consts/files";
import { AuditLogEntry } from "@/app/_types";
import fs from "fs/promises";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (user) => {
    try {
      if (!user.isAdmin) {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        );
      }

      let allLogs: AuditLogEntry[] = [];
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const dates = await getDateRange(startDate, endDate);
      const users: any[] = await readJsonFile(USERS_FILE);

      for (const u of users) {
        for (const date of dates) {
          const logPath = await getDailyLogPath(u.username, date);

          try {
            const content = await fs.readFile(logPath, "utf-8");
            const dailyLogs: AuditLogEntry[] = JSON.parse(content);
            allLogs = allLogs.concat(dailyLogs);
          } catch (error) {
            continue;
          }
        }
      }

      const logsByLevel: any = {
        DEBUG: 0,
        INFO: 0,
        WARNING: 0,
        ERROR: 0,
        CRITICAL: 0,
      };

      const logsByCategory: any = {};
      const actionCounts: Map<string, number> = new Map();
      const userCounts: Map<string, number> = new Map();

      for (const log of allLogs) {
        logsByLevel[log.level] = (logsByLevel[log.level] || 0) + 1;
        logsByCategory[log.category] = (logsByCategory[log.category] || 0) + 1;

        actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
        userCounts.set(log.username, (userCounts.get(log.username) || 0) + 1);
      }

      const topActions = Array.from(actionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([action, count]) => ({ action, count }));

      const topUsers = Array.from(userCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([username, count]) => ({ username, count }));

      allLogs.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const recentActivity = allLogs.slice(0, 10);

      const stats = {
        totalLogs: allLogs.length,
        logsByLevel,
        logsByCategory,
        topActions,
        topUsers,
        recentActivity,
      };

      return NextResponse.json(stats);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch stats" },
        { status: 500 }
      );
    }
  });
}
