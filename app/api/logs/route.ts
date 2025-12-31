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

      if (!user.isAdmin && filters.username && filters.username !== user.username) {
        return NextResponse.json(
          { error: "Forbidden: You can only view your own logs" },
          { status: 403 }
        );
      }

      if (!user.isAdmin && !filters.username) {
        filters.username = user.username;
      }
      let allLogs: AuditLogEntry[] = [];

      const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
      const startDate = filters.startDate
        ? new Date(filters.startDate)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const dates = await getDateRange(startDate, endDate);

      if (user.isAdmin && !filters.username) {
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
      } else {
        const targetUsername =
          user.isAdmin && filters.username ? filters.username : user.username;

        for (const date of dates) {
          const logPath = await getDailyLogPath(targetUsername, date);

          try {
            const content = await fs.readFile(logPath, "utf-8");
            const dailyLogs: AuditLogEntry[] = JSON.parse(content);
            allLogs = allLogs.concat(dailyLogs);
          } catch (error) {
            continue;
          }
        }
      }

      let filteredLogs = allLogs;

      if (filters.action) {
        filteredLogs = filteredLogs.filter((log) => log.action === filters.action);
      }

      if (filters.category) {
        filteredLogs = filteredLogs.filter(
          (log) => log.category === filters.category
        );
      }

      if (filters.level) {
        filteredLogs = filteredLogs.filter((log) => log.level === filters.level);
      }

      if (filters.success !== undefined) {
        filteredLogs = filteredLogs.filter(
          (log) => log.success === filters.success
        );
      }

      filteredLogs.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const total = filteredLogs.length;
      const paginatedLogs = filteredLogs.slice(filters.offset, filters.offset + filters.limit);

      return NextResponse.json({
        success: true,
        logs: paginatedLogs,
        total,
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch audit logs" },
        { status: 500 }
      );
    }
  });
}
