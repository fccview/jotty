"use server";

import { ensureDir, getUserModeDir } from "@/app/_server/actions/file";
import { Modes } from "@/app/_types/enums";
import { buildCategoryTree } from "@/app/_utils/category-utils";

export const getCategories = async (mode: Modes, username?: string) => {
  try {
    const dir = await getUserModeDir(mode, username);
    await ensureDir(dir);

    const categories = await buildCategoryTree(dir);

    return { success: true, data: categories };
  } catch (error) {
    return { error: "Failed to fetch document categories" };
  }
};
