import { getTranslations } from "next-intl/server";
import { isReadOnlyError } from "@/app/_server/actions/lib/read-only";

export const readOnlyNotice = async (): Promise<string> => {
  const t = await getTranslations("errors");
  return t("readOnlyFolder");
};

export const failedWith = async (
  error: unknown,
  fallback: string,
): Promise<string> => {
  if (!isReadOnlyError(error)) return fallback;

  return readOnlyNotice();
};

export const lockedNotice = async (): Promise<string> => {
  const t = await getTranslations("errors");
  return t("itemLocked");
};
