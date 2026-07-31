"use server";

import { Category } from "../_types";
import { serverReadDir, readOrderFile } from "../_server/actions/file";
import path from "path";
import { ARCHIVED_DIR_NAME, EXCLUDED_DIRS } from "../_consts/files";
import { catUuid, dirInfos } from "../_server/actions/share/category-info";
import { orderByUuids } from "./order-utils";

export const buildCategoryTree = async (
  dir: string,
  basePath: string = "",
  level: number = 0,
  allowArchived?: boolean
): Promise<Category[]> => {
  const categories: Category[] = [];
  const entries = await serverReadDir(dir);
  let excludedDirs = EXCLUDED_DIRS;

  if (!allowArchived) {
    excludedDirs = [...EXCLUDED_DIRS, ARCHIVED_DIR_NAME];
  }

  const order = await readOrderFile(dir);
  const dirNames = entries
    .filter((e) => e.isDirectory() && !excludedDirs.includes(e.name))
    .map((e) => e.name);

  const sortedDirNames = dirNames.sort((a, b) => a.localeCompare(b));
  const infoMap = await dirInfos(dir, sortedDirNames);

  const orderedDirNames: string[] = orderByUuids(
    sortedDirNames,
    order?.categories,
    (name) => infoMap.get(name)?.uuid,
  );

  for (const dirName of orderedDirNames) {
    const categoryPath = basePath ? `${basePath}/${dirName}` : dirName;
    const categoryDir = path.join(dir, dirName);

    const files = await serverReadDir(categoryDir);
    const count = files.filter(
      (file) => file.isFile() && file.name.endsWith(".md")
    ).length;

    const parent = basePath || undefined;
    const info = infoMap.get(dirName);
    const uuid = info?.uuid || (await catUuid(categoryDir));
    const grants = info?.sharing?.users;

    categories.push({
      name: dirName,
      count,
      path: categoryPath,
      parent,
      level,
      uuid,
      ...(grants && Object.keys(grants).length > 0 && { sharedWith: grants }),
    });

    const subCategories = await buildCategoryTree(
      categoryDir,
      categoryPath,
      level + 1,
      allowArchived
    );
    categories.push(...subCategories);
  }

  return categories;
};
