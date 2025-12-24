"use server";

import { headers } from "next/headers";
import path from "path";
import fs from "fs/promises";
import {
  AuditLogEntry,
  AuditLogLevel,
  AuditAction,
  AuditCategory,
  AuditMetadata,
  AuditLogFilters,
  AuditLogStats,
} from "@/app/_types";
import { getCurrentUser, isAdmin } from "@/app/_server/actions/users";
import { ensureDir, readJsonFile, writeJsonFile } from "@/app/_server/actions/file";
import { getUserLogsDir } from "@/app/_consts/files";
import { generateUuid } from "@/app/_utils/yaml-metadata-utils";

const getConfiguredLogLevel = (): AuditLogLevel => {
  const level = process.env.LOG_LEVEL?.toUpperCase() || "INFO";
  const validLevels: AuditLogLevel[] = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];
  return validLevels.includes(level as AuditLogLevel) ? (level as AuditLogLevel) : "INFO";
};

const LOG_LEVEL_PRIORITY: Record<AuditLogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
  CRITICAL: 4,
};

const shouldLog = (level: AuditLogLevel): boolean => {
  const configuredLevel = getConfiguredLogLevel();
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[configuredLevel];
};

const getDailyLogPath = (username: string, date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return path.join(process.cwd(), getUserLogsDir(username), String(year), month, `${day}.json`);
};

const getRequestContext = async () => {
  try {
    const headersList = headers();
    const userAgent = headersList.get("user-agent") || "Unknown";
    const forwarded = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ipAddress = forwarded || realIp || "Unknown";

    return { ipAddress, userAgent };
  } catch (error) {
    return { ipAddress: "Unknown", userAgent: "Unknown" };
  }
};

export const logAudit = async (params: {
  level: AuditLogLevel;
  action: AuditAction;
  category: AuditCategory;
  success: boolean;
  resourceType?: string;
  resourceId?: string;
  resourceTitle?: string;
  metadata?: AuditMetadata;
  errorMessage?: string;
  username?: string;
  duration?: number;
}): Promise<void> => {
  try {
    if (!shouldLog(params.level)) {
      return;
    }

    let username = params.username;
    if (!username) {
      const user = await getCurrentUser();
      username = user?.username || "system";
    }

    const { ipAddress, userAgent } = await getRequestContext();

    const logEntry: AuditLogEntry = {
      id: Date.now().toString(),
      uuid: generateUuid(),
      timestamp: new Date().toISOString(),
      level: params.level,
      username,
      action: params.action,
      category: params.category,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      resourceTitle: params.resourceTitle,
      metadata: params.metadata,
      ipAddress,
      userAgent,
      success: params.success,
      errorMessage: params.errorMessage,
      duration: params.duration,
    };

    await writeToDailyLog(logEntry, username);
  } catch (error) {
    console.error("Audit logging failed:", error);
  }
};

const writeToDailyLog = async (entry: AuditLogEntry, username: string): Promise<void> => {
  const logFilePath = getDailyLogPath(username);
  await ensureDir(path.dirname(logFilePath));

  let logs: AuditLogEntry[] = [];

  try {
    const content = await fs.readFile(logFilePath, "utf-8");
    logs = JSON.parse(content);
  } catch (error) {
    logs = [];
  }

  logs.push(entry);
  await fs.writeFile(logFilePath, JSON.stringify(logs, null, 2), "utf-8");
};

export const logAuthEvent = async (
  action: "login" | "logout" | "register" | "session_terminated",
  username: string,
  success: boolean,
  errorMessage?: string
) => {
  await logAudit({
    level: success ? "INFO" : "WARNING",
    action,
    category: "auth",
    success,
    username,
    errorMessage,
  });
};

export const logUserEvent = async (
  action: "user_created" | "user_updated" | "user_deleted" | "profile_updated" | "user_settings_updated",
  targetUser: string,
  success: boolean,
  metadata?: AuditMetadata
) => {
  await logAudit({
    level: "INFO",
    action,
    category: action === "user_settings_updated" ? "settings" : "user",
    resourceType: "user",
    resourceId: targetUser,
    success,
    metadata: { ...metadata, targetUser },
  });
};

export const logContentEvent = async (
  action: AuditAction,
  resourceType: "checklist" | "note",
  resourceId: string,
  resourceTitle: string,
  success: boolean,
  metadata?: AuditMetadata
) => {
  await logAudit({
    level: "INFO",
    action,
    category: resourceType === "checklist" ? "checklist" : "note",
    resourceType,
    resourceId,
    resourceTitle,
    success,
    metadata,
  });
};

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

  const dates = getDateRange(startDate, endDate);

  if (isUserAdmin && !filters.username) {
    const { USERS_FILE } = await import("@/app/_consts/files");
    const users: any[] = await readJsonFile(USERS_FILE);

    for (const user of users) {
      for (const date of dates) {
        const logPath = getDailyLogPath(user.username, date);

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
      const logPath = getDailyLogPath(targetUsername, date);

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

const getDateRange = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
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

export const cleanupOldLogs = async (): Promise<{
  success: boolean;
  deletedFiles: number;
  error?: string;
}> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let deletedCount = 0;
    const logsBaseDir = path.join(process.cwd(), "data/logs");

    try {
      await fs.access(logsBaseDir);
    } catch {
      return { success: true, deletedFiles: 0 };
    }

    const userDirs = await fs.readdir(logsBaseDir, { withFileTypes: true });

    for (const userEntry of userDirs) {
      if (!userEntry.isDirectory()) continue;

      const userPath = path.join(logsBaseDir, userEntry.name);
      const years = await fs.readdir(userPath, { withFileTypes: true });

      for (const yearEntry of years) {
        if (!yearEntry.isDirectory()) continue;

        const yearPath = path.join(userPath, yearEntry.name);
        const months = await fs.readdir(yearPath, { withFileTypes: true });

        for (const monthEntry of months) {
          if (!monthEntry.isDirectory()) continue;

          const monthPath = path.join(yearPath, monthEntry.name);
          const days = await fs.readdir(monthPath, { withFileTypes: true });

          for (const dayEntry of days) {
            if (!dayEntry.isFile() || !dayEntry.name.endsWith(".json")) continue;

            const day = dayEntry.name.replace(".json", "");
            const fileDate = new Date(
              `${yearEntry.name}-${monthEntry.name}-${day}`
            );

            if (fileDate < thirtyDaysAgo) {
              const filePath = path.join(monthPath, dayEntry.name);
              await fs.unlink(filePath);
              deletedCount++;
            }
          }
        }
      }
    }

    await logAudit({
      level: "INFO",
      action: "logs_cleaned",
      category: "system",
      success: true,
      username: "system",
      metadata: { deletedFiles: deletedCount },
    });

    return { success: true, deletedFiles: deletedCount };
  } catch (error: any) {
    return {
      success: false,
      deletedFiles: 0,
      error: error.message || "Cleanup failed",
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
