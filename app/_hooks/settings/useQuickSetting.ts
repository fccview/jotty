import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useSettings } from "@/app/_utils/settings-store";
import { useSettingSaver } from "@/app/_hooks/settings/useSettingSaver";
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
  const persist = useSettingSaver();
  const { user } = useAppMode();
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
    await persist(accountPatch(id, value, user), {
      label: `quick setting ${id}`,
      saved: { title: t("quickSettings.savedToAccount") },
    });
    setIsSaving(false);
  }, [id, value, user, persist, t]);

  return { value, accountValue, isOverridden, set, reset, saveToAccount, isSaving };
};
