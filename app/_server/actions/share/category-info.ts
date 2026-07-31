"use server";

import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { CategoryInfo, CategoryOrder } from "@/app/_types/sharing";
import { categoryInfoSchema } from "@/app/_schemas/sharing-schemas";
import {
  CATEGORY_INFO_FILE,
  LEGACY_ORDER_FILE,
} from "@/app/_consts/sharing";
import {
  grepFilesByText,
  grepExtractFrontmatter,
} from "@/app/_utils/grep-utils";
import { runQueued } from "@/app/_server/actions/lib/concurrency";

const _abs = (dirPath: string): string =>
  path.isAbsolute(dirPath) ? dirPath : path.join(process.cwd(), dirPath);

const _infoPath = (dirPath: string): string =>
  path.join(_abs(dirPath), CATEGORY_INFO_FILE);

const _lane = (dirPath: string): string => `catinfo:${_abs(dirPath)}`;

const _legacyOrder = async (dirPath: string): Promise<CategoryOrder | null> => {
  try {
    const raw = await fs.readFile(
      path.join(_abs(dirPath), LEGACY_ORDER_FILE),
      "utf-8",
    );
    const data = JSON.parse(raw) as CategoryOrder;
    return {
      categories: Array.isArray(data.categories) ? data.categories : undefined,
      items: Array.isArray(data.items) ? data.items : undefined,
    };
  } catch {
    return null;
  }
};

export const readCatInfo = async (dirPath: string): Promise<CategoryInfo> => {
  try {
    const raw = await fs.readFile(_infoPath(dirPath), "utf-8");
    const parsed = categoryInfoSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      console.error(
        `Invalid ${CATEGORY_INFO_FILE} in ${dirPath}, treating as unshared:`,
        parsed.error.message,
      );
      return {};
    }

    return parsed.data;
  } catch {
    const legacy = await _legacyOrder(dirPath);
    return legacy ? { order: legacy } : {};
  }
};

export const writeCatInfo = async (
  dirPath: string,
  info: CategoryInfo,
): Promise<boolean> => {
  const finalPath = _infoPath(dirPath);
  const tmpPath = `${finalPath}.${randomUUID()}.tmp`;

  try {
    await fs.mkdir(path.dirname(finalPath), { recursive: true });
    await fs.writeFile(tmpPath, JSON.stringify(info, null, 2), "utf-8");
    await fs.rename(tmpPath, finalPath);
    return true;
  } catch (error) {
    console.error(`Error writing ${CATEGORY_INFO_FILE} in ${dirPath}:`, error);
    try {
      await fs.unlink(tmpPath);
    } catch {}
    return false;
  }
};

export const patchCatInfo = async (
  dirPath: string,
  patch: Partial<CategoryInfo>,
): Promise<CategoryInfo> =>
  runQueued(_lane(dirPath), async () => {
    const current = await readCatInfo(dirPath);
    const next: CategoryInfo = { ...current, ...patch };

    await writeCatInfo(dirPath, next);
    return next;
  });

export const catUuid = async (dirPath: string): Promise<string> =>
  runQueued(_lane(dirPath), async () => {
    const info = await readCatInfo(dirPath);
    if (info.uuid) return info.uuid;

    const uuid = randomUUID();
    await writeCatInfo(dirPath, { ...info, uuid });
    return uuid;
  });

export const catDirByUuid = async (
  baseDir: string,
  uuid: string,
): Promise<string | null> => {
  const matches = await grepFilesByText(_abs(baseDir), uuid, CATEGORY_INFO_FILE);

  for (const filePath of matches) {
    const dirPath = path.dirname(filePath);
    const info = await readCatInfo(dirPath);
    if (info.uuid === uuid) return dirPath;
  }

  return null;
};

export const dirInfos = async (
  parentDir: string,
  dirNames: string[],
): Promise<Map<string, CategoryInfo>> => {
  const pairs = await Promise.all(
    dirNames.map(async (name) => {
      const info = await readCatInfo(path.join(parentDir, name));
      return [name, info] as const;
    }),
  );

  return new Map(pairs);
};

export const dirUuids = async (
  parentDir: string,
  dirNames: string[],
): Promise<Map<string, string>> => {
  const infos = await dirInfos(parentDir, dirNames);
  const map = new Map<string, string>();

  infos.forEach((info, name) => {
    if (info.uuid) map.set(name, info.uuid);
  });

  return map;
};

export const dirItemUuids = async (dirPath: string): Promise<string[]> => {
  const abs = _abs(dirPath);

  try {
    const entries = await fs.readdir(abs, { withFileTypes: true });
    const fileNames = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    const uuids = await Promise.all(
      fileNames.map(async (name) => {
        const metadata = await grepExtractFrontmatter(path.join(abs, name));
        return typeof metadata?.uuid === "string" ? metadata.uuid : null;
      }),
    );

    return uuids.filter((uuid): uuid is string => Boolean(uuid));
  } catch (error) {
    console.error(`Error listing item uuids in ${dirPath}:`, error);
    return [];
  }
};

export const subCatUuids = async (
  dirPath: string,
  excluded: string[] = [],
): Promise<string[]> => {
  const abs = _abs(dirPath);

  try {
    const entries = await fs.readdir(abs, { withFileTypes: true });
    const dirNames = entries
      .filter((entry) => entry.isDirectory() && !excluded.includes(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    const map = await dirUuids(abs, dirNames);

    return dirNames
      .map((name) => map.get(name))
      .filter((uuid): uuid is string => Boolean(uuid));
  } catch (error) {
    console.error(`Error listing subcategory uuids in ${dirPath}:`, error);
    return [];
  }
};

export const readCatOrder = async (
  dirPath: string,
): Promise<CategoryOrder | null> => {
  const info = await readCatInfo(dirPath);
  return info.order || null;
};

export const writeCatOrder = async (
  dirPath: string,
  order: CategoryOrder,
): Promise<boolean> =>
  runQueued(_lane(dirPath), async () => {
    const info = await readCatInfo(dirPath);
    const next: CategoryInfo = { ...info };

    const categories = order.categories?.length ? order.categories : undefined;
    const items = order.items?.length ? order.items : undefined;

    if (!categories && !items) {
      delete next.order;
    } else {
      next.order = { categories, items };
    }

    return writeCatInfo(dirPath, next);
  });
