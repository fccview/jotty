"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Note } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { createTemplate, getTemplates, saveAsTemplate } from "@/app/_server/actions/template";
import { itemHref } from "@/app/_utils/global-utils";
import { useToast } from "@/app/_providers/ToastProvider";

export const useTemplateList = () => {
  const t = useTranslations();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isLive = true;

    const load = async () => {
      const result = await getTemplates();
      if (!isLive) return;

      if (!result.success) {
        console.warn("Templates did not load:", result.error);
        showToast({ type: "error", title: t("common.error"), message: t("templates.loadFailed") });
      }

      setTemplates(result.data || []);
      setIsLoading(false);
    };

    load();

    return () => {
      isLive = false;
    };
  }, [showToast, t]);

  return { templates, isLoading };
};

const _editorHref = (uuid: string): string => `${itemHref(ItemTypes.NOTE, uuid)}?editor=true`;

export const useTemplateMaker = () => {
  const t = useTranslations();
  const router = useRouter();
  const { showToast } = useToast();
  const [isMaking, setIsMaking] = useState(false);

  const _complain = useCallback(
    (fallback: string, error?: string) => {
      console.warn("Template refused:", error || fallback);
      showToast({ type: "error", title: t("common.error"), message: error || fallback });
    },
    [showToast, t],
  );

  const makeBlank = useCallback(
    async (title: string): Promise<boolean> => {
      setIsMaking(true);
      try {
        const result = await createTemplate(title);
        if (!result.success || !result.data?.uuid) {
          _complain(t("templates.createFailed"), result.error);
          return false;
        }
        showToast({ type: "success", title: t("templates.created") });
        router.push(_editorHref(result.data.uuid));
        router.refresh();
        return true;
      } finally {
        setIsMaking(false);
      }
    },
    [_complain, router, showToast, t],
  );

  const copyToTemplates = useCallback(
    async (uuid: string): Promise<boolean> => {
      setIsMaking(true);
      try {
        const result = await saveAsTemplate(uuid);
        if (!result.success) {
          _complain(t("templates.saveFailed"), result.error);
          return false;
        }
        showToast({ type: "success", title: t("templates.saved") });
        router.refresh();
        return true;
      } finally {
        setIsMaking(false);
      }
    },
    [_complain, router, showToast, t],
  );

  return { makeBlank, copyToTemplates, isMaking };
};
