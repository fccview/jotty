"use server";

import path from "path";
import fs from "fs/promises";
import { getCurrentUser, isAdmin } from "@/app/_server/actions/users";
import { logAudit } from "./writers";

export const checkCleanupNeeded = async (
  username?: string
): Promise<{
  needed: boolean;
  count: number;
  maxAge: number;
}> => {
  try {
    const { getSettings } = await import("@/app/_server/actions/config");
    const settings = await getSettings();
    const maxLogAgeDays = settings?.maxLogAgeDays ?? 0;

    if (maxLogAgeDays === 0) {
      return { needed: false, count: 0, maxAge: 0 };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxLogAgeDays);

    let oldFileCount = 0;
    const logsBaseDir = path.join(process.cwd(), "data/logs");

    try {
      await fs.access(logsBaseDir);
    } catch {
      return { needed: false, count: 0, maxAge: maxLogAgeDays };
    }

    const userDirs = username
      ? [{ name: username, isDirectory: () => true }]
      : await fs.readdir(logsBaseDir, { withFileTypes: true });

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

              const day = dayEntry.name.replace(".json", "");
              const fileDate = new Date(
                `${yearEntry.name}-${monthEntry.name}-${day}`
              );

              if (fileDate < cutoffDate) {
                oldFileCount++;
              }
            }
          }
        }
      } catch {
        continue;
      }
    }

    return {
      needed: oldFileCount > 0,
      count: oldFileCount,
      maxAge: maxLogAgeDays,
    };
  } catch (error) {
    console.error("Error checking cleanup needed:", error);
    return { needed: false, count: 0, maxAge: 0 };
  }
};

export const cleanupOldLogs = async (
  username?: string,
  maxAgeDays?: number
): Promise<{
  success: boolean;
  deletedFiles: number;
  error?: string;
}> => {
  try {
    let ageDays = maxAgeDays;

    if (ageDays === undefined) {
      const { getSettings } = await import("@/app/_server/actions/config");
      const settings = await getSettings();
      ageDays = settings?.maxLogAgeDays ?? 0;
    }

    if (ageDays === 0) {
      return { success: true, deletedFiles: 0 };
    }

    if (!ageDays || ageDays < 0) {
      return { success: true, deletedFiles: 0 };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ageDays);

    let deletedCount = 0;
    const logsBaseDir = path.join(process.cwd(), "data/logs");

    try {
      await fs.access(logsBaseDir);
    } catch {
      return { success: true, deletedFiles: 0 };
    }

    const userDirs = username
      ? [{ name: username, isDirectory: () => true }]
      : await fs.readdir(logsBaseDir, { withFileTypes: true });

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

              const day = dayEntry.name.replace(".json", "");
              const fileDate = new Date(
                `${yearEntry.name}-${monthEntry.name}-${day}`
              );

              if (fileDate < cutoffDate) {
                const filePath = path.join(monthPath, dayEntry.name);
                await fs.unlink(filePath);
                deletedCount++;
              }
            }
          }
        }
      } catch {
        continue;
      }
    }

    const currentUser = await getCurrentUser();

    await logAudit({
      level: "INFO",
      action: "logs_cleaned",
      category: "system",
      success: true,
      username: currentUser?.username || username || "unknown",
      metadata: { deletedFiles: deletedCount, maxAgeDays: ageDays },
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
