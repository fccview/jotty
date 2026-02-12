"use server";

import fs from "fs/promises";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/app/_server/actions/users";

const _checkDataFilesNeedMigration = async (): Promise<boolean> => {
  try {
    const { readdir } = await import("fs/promises");
    const { join } = await import("path");
    const dataDir = join(process.cwd(), "data");

    const checkDirectory = async (dirPath: string): Promise<boolean> => {
      try {
        const items = await readdir(dirPath, { withFileTypes: true });

        for (const item of items) {
          const fullPath = join(dirPath, item.name);

          if (item.isDirectory()) {
            if (!["temp_exports", "backups"].includes(item.name)) {
              if (await checkDirectory(fullPath)) {
                return true;
              }
            }
          } else if (item.name === ".index.json") {
            const indexContent = await fs.readFile(fullPath, "utf-8");
            const index = JSON.parse(indexContent);

            const allKeys = [
              ...Object.keys(index.notes || {}),
              ...Object.keys(index.checklists || {}),
            ];

            for (const key of allKeys) {
              if (key.includes("/")) {
                return true;
              }
            }
          } else if (item.name === ".sharing.json") {
            const sharingContent = await fs.readFile(fullPath, "utf-8");
            const sharingData = JSON.parse(sharingContent);

            for (const userShares of Object.values(sharingData) as any[]) {
              for (const entry of userShares) {
                if (!entry.uuid) {
                  return true;
                }
              }
            }
          }
        }
      } catch (error) {
        const { logAudit } = await import("@/app/_server/actions/log");
        await logAudit({
          level: "DEBUG",
          action: "migration_check",
          category: "note",
          success: false,
          errorMessage: "Error checking directory for migration",
          metadata: { error: String(error) },
        });
      }

      return false;
    };

    return await checkDirectory(dataDir);
  } catch (error) {
    console.warn("Failed to check data files for migration:", error);
    return false;
  }
};

const _checkForMigrationNeeded = async (): Promise<boolean> => {
  try {
    const { SHARED_ITEMS_FILE } = await import("@/app/_consts/files");
    await fs.access(SHARED_ITEMS_FILE);
    return true;
  } catch (error) {
    const { logAudit } = await import("@/app/_server/actions/log");
    await logAudit({
      level: "DEBUG",
      action: "migration_check",
      category: "sharing",
      success: false,
      errorMessage: "Shared items file doesn't exist - no migration needed",
    });
  }

  try {
    const dataFilesNeedMigration = await _checkDataFilesNeedMigration();
    if (dataFilesNeedMigration) {
      return true;
    }
  } catch (error) {
    console.warn("Failed to check for YAML migration:", error);
  }

  return false;
};

export const CheckForNeedsMigration = async (): Promise<boolean> => {
  const needsMigration = await _checkForMigrationNeeded();
  const isLoggedIn = await isAuthenticated();
  if (needsMigration && isLoggedIn) {
    redirect("/migration");
  }

  return false;
};
