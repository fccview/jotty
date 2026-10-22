"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { UserSettingsPatch } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useToast } from "@/app/_providers/ToastProvider";
import { updateUserSettings } from "@/app/_server/actions/users";

interface SavedToast {
  title: string;
  message?: string;
}

interface SaveOptions {
  label: string;
  saved: SavedToast;
  onSaved?: () => void;
}

export const useSettingSaver = () => {
  const t = useTranslations();
  const router = useRouter();
  const { showToast } = useToast();
  const { setUser } = useAppMode();

  const grumble = useCallback(
    (label: string, reason: unknown) => {
      console.error(`Failed to save ${label}:`, reason);
      showToast({
        type: "error",
        title: t("settings.settingsSaveFailed"),
        message: t("settings.settingsSaveFailedDescription"),
      });
    },
    [showToast, t],
  );

  return useCallback(
    async (patch: UserSettingsPatch, { label, saved, onSaved }: SaveOptions): Promise<boolean> => {
      try {
        const result = await updateUserSettings(patch);
        if (!result.success || !result.data?.user) {
          grumble(label, result.error);
          return false;
        }

        onSaved?.();
        setUser(result.data.user);
        router.refresh();
        showToast({ type: "success", ...saved });
        return true;
      } catch (error) {
        grumble(label, error);
        return false;
      }
    },
    [grumble, setUser, router, showToast],
  );
};
