"use server";

import { Category } from "../_types";
import { serverReadDir, readOrderFile } from "../_server/actions/file";
import path from "path";
import { ARCHIVED_DIR_NAME, EXCLUDED_DIRS } from "../_consts/files";

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

  const orderedDirNames: string[] = order?.categories
    ? [
        ...order.categories.filter((n) => dirNames.includes(n)),
        ...dirNames
          .filter((n) => !order.categories!.includes(n))
          .sort((a, b) => a.localeCompare(b)),
      ]
    : dirNames.sort((a, b) => a.localeCompare(b));

  for (const dirName of orderedDirNames) {
    const categoryPath = basePath ? `${basePath}/${dirName}` : dirName;
    const categoryDir = path.join(dir, dirName);

    const files = await serverReadDir(categoryDir);
    const count = files.filter(
      (file) => file.isFile() && file.name.endsWith(".md")
    ).length;

    const parent = basePath || undefined;

    categories.push({
      name: dirName,
      count,
      path: categoryPath,
      parent,
      level,
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
