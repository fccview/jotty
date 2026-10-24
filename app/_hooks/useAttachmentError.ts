import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { isAttachmentError } from "@/app/_consts/attachments";

export const useAttachmentError = () => {
  const t = useTranslations();

  return useCallback(
    (error: string | undefined, fallback: string): string =>
      t(isAttachmentError(error) ? error : fallback),
    [t],
  );
};
