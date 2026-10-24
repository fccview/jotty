"use server";

import path from "path";
import fs from "fs/promises";
import { getCurrentUser, isAdmin } from "@/app/_server/actions/users";
import { logAudit } from "./writers";
import { countOldLogs, sweepOldLogs } from "./sweep";
import { validateNoPathTraversal } from "@/app/_utils/path-utils";

type CleanupCheck = { needed: boolean; count: number; maxAge: number };
type CleanupResult = { success: boolean; deletedFiles: number; error?: string };

const _logOwner = async (
  username?: string,
): Promise<{ allowed: boolean; username?: string }> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { allowed: false };

  if (username && !validateNoPathTraversal(username)) return { allowed: false };

  if (currentUser.isAdmin) return { allowed: true, username };

  if (username && username !== currentUser.username) return { allowed: false };

  return { allowed: true, username: currentUser.username };
};

export const checkCleanupNeeded = async (
  username?: string
): Promise<CleanupCheck> => {
  const owner = await _logOwner(username);
  if (!owner.allowed) return { needed: false, count: 0, maxAge: 0 };

  return countOldLogs(owner.username);
};

export const cleanupOldLogs = async (
  username?: string,
  maxAgeDays?: number
): Promise<CleanupResult> => {
  const owner = await _logOwner(username);
  if (!owner.allowed) {
    return { success: false, deletedFiles: 0, error: "Permission denied" };
  }

  return sweepOldLogs(owner.username, maxAgeDays);
};

export const deleteAllLogs = async (): Promise<{
  success: boolean;
  deletedFiles: number;
  error?: string;
}> => {
  try {
    const currentUser = await getCurrentUser();
    const admin = await isAdmin();

    if (!admin) {
      return {
        success: false,
        deletedFiles: 0,
        error: "Admin access required",
      };
    }

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

      try {
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

              const filePath = path.join(monthPath, dayEntry.name);
              await fs.unlink(filePath);
              deletedCount++;
            }
          }
        }
      } catch {
        continue;
      }
    }

    await logAudit({
      level: "WARNING",
      action: "logs_cleaned",
      category: "system",
      success: true,
      username: currentUser?.username || "unknown",
      metadata: { deletedFiles: deletedCount, deleteAll: true },
    });

    return { success: true, deletedFiles: deletedCount };
  } catch (error: any) {
    return {
      success: false,
      deletedFiles: 0,
      error: error.message || "Delete all logs failed",
    };
  }
};
