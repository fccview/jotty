"use server";

import { Modes } from "@/app/_types/enums";
import { getUsername } from "@/app/_server/actions/users";
import { categoriesFor } from "./tree";

export const getCategories = async (
  mode: Modes,
): Promise<Awaited<ReturnType<typeof categoriesFor>>> => {
  const username = await getUsername();
  if (!username) return { error: "Failed to fetch document categories" };

  return categoriesFor(mode, username);
};
