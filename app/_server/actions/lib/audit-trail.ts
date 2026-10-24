import fs from "fs/promises";
import { getDailyLogPath, getDateRange } from "@/app/_server/actions/log";
import { readJsonFile } from "@/app/_server/actions/file";
import { USERS_FILE } from "@/app/_consts/files";
import { DAY_MS, LOG_READ_BATCH_DAYS, LOG_WINDOW_DAYS } from "@/app/_consts/logs";
import { AuditCategory, AuditLogEntry, AuditLogLevel, User } from "@/app/_types";

export interface LogWindow {
  startDate?: string;
  endDate?: string;
}

export interface LogSieve {
  action?: string;
  category?: AuditCategory;
  level?: AuditLogLevel;
  success?: boolean;
}

const _readDay = async (username: string, date: Date): Promise<AuditLogEntry[]> => {
  const logPath = await getDailyLogPath(username, date);
  try {
    return JSON.parse(await fs.readFile(logPath, "utf-8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`Unreadable audit log ${logPath}:`, error);
    }
    return [];
  }
};

export const everyUsername = async (): Promise<string[]> => {
  const users: User[] | null = await readJsonFile(USERS_FILE);
  return (users ?? []).map((user) => user.username);
};

export const digUpLogs = async (
  usernames: string[],
  { startDate, endDate }: LogWindow = {},
): Promise<AuditLogEntry[]> => {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - LOG_WINDOW_DAYS * DAY_MS);
  const dates = await getDateRange(start, end);

  const logs: AuditLogEntry[] = [];
  for (const username of usernames) {
    for (let at = 0; at < dates.length; at += LOG_READ_BATCH_DAYS) {
      const batch = dates.slice(at, at + LOG_READ_BATCH_DAYS);
      const days = await Promise.all(batch.map((date) => _readDay(username, date)));
      logs.push(...days.flat());
    }
  }
  return logs;
};

export const newestFirst = (logs: AuditLogEntry[]) =>
  [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

export const sieveLogs = (logs: AuditLogEntry[], sieve: LogSieve) =>
  newestFirst(
    logs.filter(
      (log) =>
        (!sieve.action || log.action === sieve.action) &&
        (!sieve.category || log.category === sieve.category) &&
        (!sieve.level || log.level === sieve.level) &&
        (sieve.success === undefined || log.success === sieve.success),
    ),
  );
