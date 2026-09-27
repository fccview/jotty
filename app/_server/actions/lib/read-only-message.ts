import { getTranslations } from "next-intl/server";
import { isReadOnlyError } from "@/app/_server/actions/lib/read-only";

export const failedWith = async (
  error: unknown,
  fallback: string,
): Promise<string> => {
  if (!isReadOnlyError(error)) return fallback;

  const t = await getTranslations("errors");
  return t("readOnlyFolder");
};
