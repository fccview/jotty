"use server";

import path from "path";
import fs from "fs/promises";
import { Result } from "@/app/_types";
import { SharingPermissions } from "@/app/_types/core";
import { Modes } from "@/app/_types/enums";
import { DATA_DIR, ARCHIVED_DIR_NAME, EXCLUDED_DIRS } from "@/app/_consts/files";
import {
  CATEGORY_INFO_FILE,
  LEGACY_ORDER_FILE,
  LEGACY_SHARING_FILE,
  SHARED_WITH_KEY,
} from "@/app/_consts/sharing";
import { toSharedWith } from "@/app/_utils/sharing-utils";
import {
  extractYamlMetadata,
  generateUuid,
  updateYamlMetadata,
} from "@/app/_utils/yaml-metadata-utils";
import { grepExtractFrontmatter } from "@/app/_utils/grep-utils";
import { isAdmin } from "@/app/_server/actions/users";
import { needsMigration } from "@/app/_server/actions/lib/migration-check";
import {
  readCatInfo,
  writeCatInfo,
  catUuid,
  dirUuids,
} from "@/app/_server/actions/share/category-info";

interface LegacyEntry {
  uuid?: string;
  sharer: string;
  permissions: SharingPermissions;
}

interface OrderConversion {
  converted: boolean;
  unresolved: string[];
}

const MIGRATED_MODES = [Modes.NOTES, Modes.CHECKLISTS];

const _modeDir = (mode: Modes): string =>
  path.join(process.cwd(), DATA_DIR, mode);

const _userDirs = async (mode: Modes): Promise<string[]> => {
  try {
    const entries = await fs.readdir(_modeDir(mode), { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(_modeDir(mode), entry.name));
  } catch {
    return [];
  }
};

const _subDirs = async (dirPath: string): Promise<string[]> => {
  const excluded = [...EXCLUDED_DIRS, ARCHIVED_DIR_NAME];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && !excluded.includes(entry.name))
      .map((entry) => path.join(dirPath, entry.name));
  } catch {
    return [];
  }
};

const _uuidOfFile = async (filePath: string): Promise<string | null> => {
  const metadata = await grepExtractFrontmatter(filePath);
  return typeof metadata?.uuid === "string" ? metadata.uuid : null;
};

const _mdNames = async (dirPath: string): Promise<string[]> => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name);
  } catch {
    return [];
  }
};

const _stampItems = async (dirPath: string): Promise<void> => {
  for (const name of await _mdNames(dirPath)) {
    const filePath = path.join(dirPath, name);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      const { metadata } = extractYamlMetadata(content);

      if (metadata.uuid) continue;

      await fs.writeFile(
        filePath,
        updateYamlMetadata(content, { uuid: generateUuid() }),
        "utf-8",
      );
    } catch (error) {
      console.error(`Failed to stamp uuid on ${filePath}:`, error);
    }
  }
};

const _convertOrder = async (dirPath: string): Promise<OrderConversion> => {
  const legacyPath = path.join(dirPath, LEGACY_ORDER_FILE);

  try {
    await fs.access(legacyPath);
  } catch {
    return { converted: false, unresolved: [] };
  }

  try {
    const raw = await fs.readFile(legacyPath, "utf-8");
    const legacy = JSON.parse(raw) as {
      categories?: string[];
      items?: string[];
    };

    const categories: string[] = [];
    const items: string[] = [];
    const unresolved: string[] = [];

    if (Array.isArray(legacy.categories) && legacy.categories.length > 0) {
      const map = await dirUuids(dirPath, legacy.categories);
      legacy.categories.forEach((name) => {
        const uuid = map.get(name);
        if (uuid) {
          categories.push(uuid);
        } else {
          unresolved.push(name);
        }
      });
    }

    if (Array.isArray(legacy.items) && legacy.items.length > 0) {
      for (const id of legacy.items) {
        const uuid = await _uuidOfFile(path.join(dirPath, `${id}.md`));
        if (uuid) {
          items.push(uuid);
        } else {
          unresolved.push(`${id}.md`);
        }
      }
    }

    const info = await readCatInfo(dirPath);
    await writeCatInfo(dirPath, {
      ...info,
      order: {
        categories: categories.length > 0 ? categories : undefined,
        items: items.length > 0 ? items : undefined,
      },
    });

    if (unresolved.length > 0) {
      console.warn(
        `Kept ${LEGACY_ORDER_FILE} in ${dirPath}, these ordering targets did not resolve:`,
        unresolved.join(", "),
      );
      return { converted: true, unresolved };
    }

    await fs.unlink(legacyPath);
    return { converted: true, unresolved: [] };
  } catch (error) {
    console.error(`Failed to convert order file in ${dirPath}:`, error);
    return { converted: false, unresolved: [] };
  }
};

const _stampTree = async (
  dirPath: string,
  isRoot: boolean,
  changes: string[],
): Promise<void> => {
  if (!isRoot) {
    await catUuid(dirPath);
  }

  const subDirs = await _subDirs(dirPath);

  for (const subDir of subDirs) {
    await catUuid(subDir);
  }

  await _stampItems(dirPath);

  const conversion = await _convertOrder(dirPath);

  if (conversion.converted) {
    changes.push(`Converted ordering in ${path.basename(dirPath)}`);
  }

  if (conversion.unresolved.length > 0) {
    changes.push(
      `Kept ${LEGACY_ORDER_FILE} in ${path.basename(dirPath)}, unresolved entries: ${conversion.unresolved.join(", ")}`,
    );
  }

  for (const subDir of subDirs) {
    await _stampTree(subDir, false, changes);
  }
};

const _legacyShares = async (
  mode: Modes,
): Promise<Record<string, LegacyEntry[]> | null> => {
  try {
    const raw = await fs.readFile(
      path.join(_modeDir(mode), LEGACY_SHARING_FILE),
      "utf-8",
    );
    return JSON.parse(raw) as Record<string, LegacyEntry[]>;
  } catch {
    return null;
  }
};

const _findByUuid = async (
  ownerDir: string,
  uuid: string,
): Promise<string | null> => {
  const { grepFindFileByUuid } = await import("@/app/_utils/grep-utils");
  const found = await grepFindFileByUuid(ownerDir, uuid);
  return found ? found.filePath : null;
};

const _applyShares = async (
  filePath: string,
  users: Record<string, SharingPermissions>,
): Promise<void> => {
  const content = await fs.readFile(filePath, "utf-8");
  const updated = updateYamlMetadata(content, {
    [SHARED_WITH_KEY]: toSharedWith(users),
  });

  await fs.writeFile(filePath, updated, "utf-8");
};

const _migrateShares = async (
  mode: Modes,
  changes: string[],
): Promise<void> => {
  const data = await _legacyShares(mode);
  if (!data) return;

  const perFile = new Map<string, Record<string, SharingPermissions>>();

  for (const [receiver, entries] of Object.entries(data)) {
    for (const entry of entries) {
      if (!entry.uuid || !entry.sharer) continue;

      const ownerDir = path.join(_modeDir(mode), entry.sharer);
      const filePath = await _findByUuid(ownerDir, entry.uuid);

      if (!filePath) {
        changes.push(`Skipped missing ${mode} item ${entry.uuid}`);
        continue;
      }

      const current = perFile.get(filePath) || {};
      current[receiver] = entry.permissions;
      perFile.set(filePath, current);
    }
  }

  let failures = 0;

  for (const [filePath, users] of Array.from(perFile.entries())) {
    try {
      await _applyShares(filePath, users);
      changes.push(
        `Moved sharing into ${path.basename(filePath)} (${Object.keys(users).join(", ")})`,
      );
    } catch (error) {
      failures += 1;
      console.error(`Failed to migrate shares for ${filePath}:`, error);
    }
  }

  if (failures > 0) {
    changes.push(
      `Kept legacy ${mode}/${LEGACY_SHARING_FILE}, ${failures} item(s) could not be written. Re-run once the cause is fixed.`,
    );
    return;
  }

  await fs.unlink(path.join(_modeDir(mode), LEGACY_SHARING_FILE));
  changes.push(`Removed legacy ${mode}/${LEGACY_SHARING_FILE}`);
};

export const migrateToInlineSharing = async (): Promise<
  Result<{ migrated: boolean; changes: string[] }>
> => {
  const changes: string[] = [];

  try {
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized: Admin access required" };
    }

    for (const mode of MIGRATED_MODES) {
      const userDirs = await _userDirs(mode);

      for (const userDir of userDirs) {
        await _stampTree(userDir, true, changes);
      }

      await _migrateShares(mode, changes);
    }

    changes.push(`Category metadata now lives in ${CATEGORY_INFO_FILE}`);

    await needsMigration();

    return { success: true, data: { migrated: true, changes } };
  } catch (error) {
    console.error("Error in migrateToInlineSharing:", error);
    return { success: false, error: "Failed to migrate sharing data" };
  }
};
