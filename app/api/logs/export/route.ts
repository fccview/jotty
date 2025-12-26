import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getDailyLogPath, getDateRange } from "@/app/_server/actions/log";
import { readJsonFile } from "@/app/_server/actions/file";
import { USERS_FILE } from "@/app/_consts/files";
import { AuditLogEntry } from "@/app/_types";
import fs from "fs/promises";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { format, filters = {} } = body;

      if (!format || !["json", "csv"].includes(format)) {
        return NextResponse.json(
          { error: "Invalid format. Must be 'json' or 'csv'" },
          { status: 400 }
        );
      }

      const restrictedFilters = { ...filters };

      if (!user.isAdmin) {
        restrictedFilters.username = user.username;
      }

      let allLogs: AuditLogEntry[] = [];

      const endDate = restrictedFilters.endDate ? new Date(restrictedFilters.endDate) : new Date();
      const startDate = restrictedFilters.startDate
        ? new Date(restrictedFilters.startDate)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const dates = await getDateRange(startDate, endDate);

      if (user.isAdmin && !restrictedFilters.username) {
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
          user.isAdmin && restrictedFilters.username ? restrictedFilters.username : user.username;

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

      if (restrictedFilters.action) {
        filteredLogs = filteredLogs.filter((log) => log.action === restrictedFilters.action);
      }

      if (restrictedFilters.category) {
        filteredLogs = filteredLogs.filter(
          (log) => log.category === restrictedFilters.category
        );
      }

      if (restrictedFilters.level) {
        filteredLogs = filteredLogs.filter((log) => log.level === restrictedFilters.level);
      }

      if (restrictedFilters.success !== undefined) {
        filteredLogs = filteredLogs.filter(
          (log) => log.success === restrictedFilters.success
        );
      }

      filteredLogs.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      if (restrictedFilters.limit) {
        filteredLogs = filteredLogs.slice(0, restrictedFilters.limit);
      }

      let exportData: string;
      let contentType: string;

      if (format === "json") {
        exportData = JSON.stringify(filteredLogs, null, 2);
        contentType = "application/json";
      } else {
        const headers = [
          "Timestamp",
          "Level",
          "Username",
          "Action",
          "Category",
          "Resource Type",
          "Resource ID",
          "Resource Title",
          "Success",
          "IP Address",
          "Error Message",
        ];

        const csvRows = [
          headers.join(","),
          ...filteredLogs.map((log) =>
            [
              log.timestamp,
              log.level,
              log.username,
              log.action,
              log.category,
              log.resourceType || "",
              log.resourceId || "",
              log.resourceTitle || "",
              log.success,
              log.ipAddress,
              log.errorMessage || "",
            ]
              .map((field) => `"${String(field).replace(/"/g, '""')}"`)
              .join(",")
          ),
        ];

        exportData = csvRows.join("\n");
        contentType = "text/csv";
      }

      const filename = `audit-logs-${Date.now()}.${format}`;

      return new NextResponse(exportData, {
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
  });
}
