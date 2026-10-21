import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useToast } from "@/app/_providers/ToastProvider";
import { useSettings } from "@/app/_utils/settings-store";
import { updateUserSettings } from "@/app/_server/actions/users";
import {
  QuickSettingId,
  QuickSettingValues,
  accountPatch,
  accountValueOf,
} from "@/app/_consts/quick-settings";

export const useQuickValue = <K extends QuickSettingId>(id: K): QuickSettingValues[K] => {
  const { user } = useAppMode();
  const override = useSettings((state) => state.overrides[id]);
  return override === undefined ? accountValueOf(id, user) : (override as QuickSettingValues[K]);
};

export const useQuickSetting = <K extends QuickSettingId>(id: K) => {
  const t = useTranslations();
  const router = useRouter();
  const { showToast } = useToast();
  const { user, setUser } = useAppMode();
  const override = useSettings((state) => state.overrides[id]);
  const setOverride = useSettings((state) => state.setOverride);
  const clearOverride = useSettings((state) => state.clearOverride);
  const [isSaving, setIsSaving] = useState(false);

  const accountValue = accountValueOf(id, user);
  const isOverridden = override !== undefined;
  const value = isOverridden ? (override as QuickSettingValues[K]) : accountValue;

  const set = useCallback(
    (next: QuickSettingValues[K]) => setOverride(id, next),
    [id, setOverride],
  );

  const reset = useCallback(() => clearOverride(id), [id, clearOverride]);

  const saveToAccount = useCallback(async () => {
    setIsSaving(true);
    try {
      const result = await updateUserSettings(accountPatch(id, value, user));
      if (!result.success || !result.data?.user) {
        console.error(`Failed to save quick setting ${id}:`, result.error);
        showToast({
          type: "error",
          title: t("settings.settingsSaveFailed"),
          message: t("settings.settingsSaveFailedDescription"),
        });
        return;
      }

      setUser(result.data.user);
      showToast({ type: "success", title: t("quickSettings.savedToAccount") });
      router.refresh();
    } catch (error) {
      console.error(`Failed to save quick setting ${id}:`, error);
      showToast({
        type: "error",
        title: t("settings.settingsSaveFailed"),
        message: t("settings.settingsSaveFailedDescription"),
      });
    } finally {
      setIsSaving(false);
    }
  }, [id, value, user, setUser, showToast, t, router]);

  return { value, accountValue, isOverridden, set, reset, saveToAccount, isSaving };
};
