"use client";

import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon } from "@hugeicons/core-free-icons";
import { copyTextToClipboard } from "@/app/_utils/global-utils";
import { useToast } from "@/app/_providers/ToastProvider";

export const PublicCopyButton = ({ markdown }: { markdown: string }) => {
  const t = useTranslations();
  const { showToast } = useToast();

  const copy = async () => {
    if (await copyTextToClipboard(markdown)) {
      showToast({ type: "success", title: t("common.copiedToClipboard") });
      return;
    }
    showToast({ type: "error", title: t("common.copyFailed") });
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={t("notes.copyRawContent")}
      aria-label={t("notes.copyRawContent")}
      className="flex-none rounded-[calc(var(--jotty-radius-effective)*0.75)] p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <HugeiconsIcon icon={Copy01Icon} className="h-5 w-5" />
    </button>
  );
};
