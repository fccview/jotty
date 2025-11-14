import { MigrationPage } from "@/app/_components/FeatureComponents/Migration/MigrationPage";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { SHARED_ITEMS_FILE } from "@/app/_consts/files";
import { redirect } from "next/navigation";

/**
 * Checks if migration has already been completed by looking for .migration file
 * Returns true if migration is already complete (file exists with version 1.11.0)
 */
const checkMigrationAlreadyCompleted = (): boolean => {
  try {
    const migrationFile = join(process.cwd(), "data", ".migration");

    if (!existsSync(migrationFile)) {
      return false;
    }

    const content = require("fs").readFileSync(migrationFile, "utf-8");
    const migrationData = JSON.parse(content);

    return migrationData["1.11.0"] === true;
  } catch (error) {
    console.warn("Failed to check migration status:", error);
    return false;
  }
};

/**
 * Checks if any .index.json files are using the old path-based format
 * Returns true if migration is needed
 */
const checkDataFilesNeedMigration = (): boolean => {
  try {
    const dataDir = join(process.cwd(), "data");

    const checkDirectory = (dirPath: string): boolean => {
      try {
        const items = readdirSync(dirPath, { withFileTypes: true });

        for (const item of items) {
          const fullPath = join(dirPath, item.name);

          if (item.isDirectory()) {
            if (checkDirectory(fullPath)) {
              return true;
            }
          } else if (item.name === ".index.json") {
            const indexContent = require("fs").readFileSync(fullPath, "utf-8");
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
            const sharingContent = require("fs").readFileSync(
              fullPath,
              "utf-8"
            );
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
        // Continue checking other directories
      }

      return false;
    };

    return checkDirectory(dataDir);
  } catch (error) {
    console.warn("Failed to check index files for migration:", error);
    return false;
  }
};

export default async function Migration() {
  if (checkMigrationAlreadyCompleted()) {
    redirect("/");
  }

  const needsSharingMigration = existsSync(SHARED_ITEMS_FILE);

  let needsYamlMigration = false;
  try {
    needsYamlMigration = checkDataFilesNeedMigration();
  } catch (error) {
    console.warn("Failed to check for migration needs:", error);
  }

  if (!needsSharingMigration && !needsYamlMigration) {
    redirect("/");
  }

  return <MigrationPage />;
}
