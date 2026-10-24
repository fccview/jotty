import { useCallback, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/app/_providers/ToastProvider";
import { copyTextToClipboard } from "@/app/_utils/global-utils";

export const INLINE_CODE_COPIED = "is-copied";
const COPIED_MS = 1200;

export const useInlineCodeCopy = () => {
  const t = useTranslations();
  const { showToast } = useToast();

  return useCallback(
    async (event: MouseEvent<HTMLElement>) => {
      const code = (event.target as HTMLElement).closest("code");
      if (!code || code.closest("pre") || window.getSelection()?.toString()) return;
      const copied = await copyTextToClipboard(code.textContent || "");
      showToast({
        type: copied ? "success" : "error",
        title: t(copied ? "common.copied" : "common.copyFailed"),
      });
      if (!copied) return;
      code.classList.add(INLINE_CODE_COPIED);
      setTimeout(() => code.classList.remove(INLINE_CODE_COPIED), COPIED_MS);
    },
    [showToast, t],
  );
};
