"use server";

import path from "path";
import fs from "fs/promises";
import {
  AuditLogEntry,
  AuditLogLevel,
  AuditAction,
  AuditCategory,
  AuditMetadata,
} from "@/app/_types";
import { getCurrentUser } from "@/app/_server/actions/users";
import { ensureDir } from "@/app/_server/actions/file";
import { generateUuid } from "@/app/_utils/yaml-metadata-utils";
import { shouldLog, getRequestContext, getDailyLogPath } from "./helpers";

const writeToDailyLog = async (entry: AuditLogEntry, username: string): Promise<void> => {
  const logFilePath = await getDailyLogPath(username);
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
    if (!(await shouldLog(params.level))) {
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
