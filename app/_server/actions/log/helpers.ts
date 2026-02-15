"use server";

import { headers } from "next/headers";
import path from "path";
import { AuditLogLevel } from "@/app/_types";
import { getUserLogsDir } from "@/app/_consts/files";

const getConfiguredLogLevel = async (): Promise<AuditLogLevel> => {
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

export const shouldLog = async (level: AuditLogLevel): Promise<boolean> => {
  const configuredLevel = await getConfiguredLogLevel();
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[configuredLevel];
};

export const getDailyLogPath = async (username: string, date: Date = new Date()): Promise<string> => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return path.join(process.cwd(), getUserLogsDir(username), String(year), month, `${day}.json`);
};

export const getRequestContext = async () => {
  try {
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "Unknown";
    const forwarded = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ipAddress = forwarded || realIp || "Unknown";

    return { ipAddress, userAgent };
  } catch (error) {
    return { ipAddress: "Unknown", userAgent: "Unknown" };
  }
};

export const getDateRange = async (start: Date, end: Date): Promise<Date[]> => {
  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};
