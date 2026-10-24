"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useToast } from "@/app/_providers/ToastProvider";
import { linkMention } from "@/app/_server/actions/relations";
import type { MentionedIn } from "@/app/_types/relations";

export const useMentionLink = (targetUuid?: string) => {
  const router = useRouter();
  const t = useTranslations();
  const { showToast } = useToast();
  const [linking, setLinking] = useState<string | null>(null);

  const link = async (source: MentionedIn) => {
    if (!targetUuid) return;
    setLinking(source.uuid);
    try {
      const result = await linkMention(source.uuid, targetUuid);
      if (!result.success) {
        showToast({ type: "error", title: t("common.error"), message: t("relations.linkFailed") });
        return;
      }
      showToast({
        type: "success",
        title: t("common.success"),
        message: t("relations.linked", { title: source.title }),
      });
      router.refresh();
    } finally {
      setLinking(null);
    }
  };

  return { linking, link };
};
