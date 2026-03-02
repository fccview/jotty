"use server";

import { revalidatePath } from "next/cache";
import path from "path";
import {
  getUserModeDir,
  readOrderFile,
  writeOrderFile,
} from "@/app/_server/actions/file";
import { Modes } from "@/app/_types/enums";
import { getUsername } from "@/app/_server/actions/users";
import { broadcast } from "@/app/_server/ws/broadcast";

export const setCategoryOrder = async (formData: FormData) => {
  try {
    const mode = formData.get("mode") as Modes;
    const parent = (formData.get("parent") as string) || "";
    const categoriesStr = formData.get("categories") as string;
    const categories = JSON.parse(categoriesStr) as string[];

    const baseDir = await getUserModeDir(mode);
    const dirPath = parent ? path.join(baseDir, parent) : baseDir;

    const existing = await readOrderFile(dirPath);
    const data = { categories, items: existing?.items };
    const result = await writeOrderFile(dirPath, data);
    if (!result.success) return { error: "Failed to write order" };

    try {
      revalidatePath("/");
    } catch { }

    await broadcast({
      type: "category",
      action: "updated",
      username: await getUsername(),
    });

    return { success: true };
  } catch {
    return { error: "Failed to set category order" };
  }
};

export const setChecklistOrderInCategory = async (formData: FormData) => {
  try {
    const mode = formData.get("mode") as Modes;
    const category = (formData.get("category") as string) || "Uncategorized";
    const itemsStr = formData.get("items") as string;
    const items = JSON.parse(itemsStr) as string[];

    const baseDir = await getUserModeDir(mode);
    const dirPath = path.join(baseDir, category);

    const existing = await readOrderFile(dirPath);
    const data = { categories: existing?.categories, items };
    const result = await writeOrderFile(dirPath, data);
    if (!result.success) return { error: "Failed to write order" };

    try {
      revalidatePath("/");
    } catch { }

    await broadcast({
      type: "category",
      action: "updated",
      username: await getUsername(),
    });

    return { success: true };
  } catch {
    return { error: "Failed to set item order" };
  }
};
