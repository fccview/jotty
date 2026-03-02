"use server";

import fs from "fs/promises";
import {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogStats,
  AuditLogLevel,
  AuditCategory,
} from "@/app/_types";
import { getCurrentUser, isAdmin } from "@/app/_server/actions/users";
import { readJsonFile } from "@/app/_server/actions/file";
import { getDailyLogPath, getDateRange } from "./helpers";

export const getAuditLogs = async (
  filters: AuditLogFilters = {}
): Promise<{ logs: AuditLogEntry[]; total: number }> => {
  const currentUser = await getCurrentUser();
  const isUserAdmin = await isAdmin();

  if (!currentUser) {
    throw new Error("Not authenticated");
  }

  let allLogs: AuditLogEntry[] = [];

  const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
  const startDate = filters.startDate
    ? new Date(filters.startDate)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dates = await getDateRange(startDate, endDate);

  if (isUserAdmin && !filters.username) {
    const { USERS_FILE } = await import("@/app/_consts/files");
    const users: any[] = await readJsonFile(USERS_FILE);

    for (const user of users) {
      for (const date of dates) {
        const logPath = await getDailyLogPath(user.username, date);

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
    const targetUsername = isUserAdmin && filters.username
      ? filters.username
      : currentUser.username;

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
    filteredLogs = filteredLogs.filter(log => log.action === filters.action);
  }

  if (filters.category) {
    filteredLogs = filteredLogs.filter(log => log.category === filters.category);
  }

  if (filters.level) {
    filteredLogs = filteredLogs.filter(log => log.level === filters.level);
  }

  if (filters.success !== undefined) {
    filteredLogs = filteredLogs.filter(log => log.success === filters.success);
  }

  filteredLogs.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const total = filteredLogs.length;

  const offset = filters.offset || 0;
  const limit = filters.limit || 50;
  const paginatedLogs = filteredLogs.slice(offset, offset + limit);

  return { logs: paginatedLogs, total };
};

const convertToCSV = (logs: AuditLogEntry[]): string => {
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

  const rows = logs.map(log => [
    log.timestamp,
    log.level,
    log.username,
    log.action,
    log.category,
    log.resourceType || "",
    log.resourceId || "",
    log.resourceTitle || "",
    log.success ? "Yes" : "No",
    log.ipAddress,
    log.errorMessage || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
};

export const exportAuditLogs = async (
  format: "json" | "csv",
  filters: AuditLogFilters = {}
): Promise<{ success: boolean; data?: string; error?: string }> => {
  try {
    const { logs } = await getAuditLogs(filters);

    if (format === "json") {
      return {
        success: true,
        data: JSON.stringify(logs, null, 2),
      };
    } else {
      const csv = convertToCSV(logs);
      return {
        success: true,
        data: csv,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Export failed",
    };
  }
};

export const getAuditLogStats = async (): Promise<AuditLogStats> => {
  const { logs } = await getAuditLogs({ limit: 10000 });

  const logsByLevel: Record<AuditLogLevel, number> = {
    DEBUG: 0,
    INFO: 0,
    WARNING: 0,
    ERROR: 0,
    CRITICAL: 0,
  };

  const logsByCategory: Record<string, number> = {};
  const actionCounts: Record<string, number> = {};
  const userCounts: Record<string, number> = {};

  logs.forEach(log => {
    logsByLevel[log.level]++;
    logsByCategory[log.category] = (logsByCategory[log.category] || 0) + 1;
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    userCounts[log.username] = (userCounts[log.username] || 0) + 1;
  });

  const topActions = Object.entries(actionCounts)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topUsers = Object.entries(userCounts)
    .map(([username, count]) => ({ username, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalLogs: logs.length,
    logsByLevel,
    logsByCategory: logsByCategory as Record<AuditCategory, number>,
    topActions,
    topUsers,
    recentActivity: logs.slice(0, 10),
  };
};
