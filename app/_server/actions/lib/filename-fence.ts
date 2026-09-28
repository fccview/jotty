import path from "path";
import { getTranslations } from "next-intl/server";
import { isPathSafe } from "@/app/_utils/path-utils";

export const fenceFilename = async (
  categoryDir: string,
  filename: string,
): Promise<string | null> => {
  const landsInside =
    isPathSafe(categoryDir, filename) &&
    path.dirname(path.resolve(categoryDir, filename)) ===
      path.resolve(categoryDir);

  if (landsInside) return null;

  console.warn("Refusing filename outside its category:", filename);
  const t = await getTranslations("errors");
  return t("filenameOutOfBounds");
};
