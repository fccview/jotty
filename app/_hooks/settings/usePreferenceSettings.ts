"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { User, UserSettingsPatch } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useToast } from "@/app/_providers/ToastProvider";
import { useSettingSaver } from "@/app/_hooks/settings/useSettingSaver";
import { EDITABLE_SETTING_KEYS } from "@/app/_consts/user-settings";
import { QUICK_SETTINGS, SliderSettingId, accountPatch } from "@/app/_consts/quick-settings";
import { settingErrorOf } from "@/app/_schemas/setting-checks";
import { applyPatch, mergeIncoming, storedSettingsOf } from "@/app/_utils/settings/preference-utils";

type Settings = Partial<User>;
type SettingValue = User[keyof User] | null;

export const usePreferenceSettings = () => {
  const t = useTranslations();
  const { showToast } = useToast();
  const persist = useSettingSaver();
  const { user } = useAppMode();
  const [current, setCurrent] = useState<Settings>(() => storedSettingsOf(user));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saved = useRef<Settings>(storedSettingsOf(user));
  const latest = useRef<Settings>(storedSettingsOf(user));
  const committed = useRef<Settings>(storedSettingsOf(user));
  const pending = useRef(new Map<keyof User, number>());
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const incoming = storedSettingsOf(user);
    const busy = new Set(
      EDITABLE_SETTING_KEYS.filter(
        (key) => (pending.current.get(key) ?? 0) > 0 || latest.current[key] !== committed.current[key],
      ),
    );
    const keepsLocal = (key: keyof User) => busy.has(key);
    saved.current = incoming;
    committed.current = mergeIncoming(incoming, committed.current, keepsLocal);
    latest.current = mergeIncoming(incoming, latest.current, keepsLocal);
    setCurrent(latest.current);
  }, [user]);

  const track = (key: keyof User, delta: number) =>
    pending.current.set(key, Math.max(0, (pending.current.get(key) ?? 0) + delta));

  const patchLocal = (patch: UserSettingsPatch, alsoCommitted: boolean) => {
    latest.current = applyPatch(latest.current, patch);
    if (alsoCommitted) committed.current = applyPatch(committed.current, patch);
    setCurrent((prev) => applyPatch(prev, patch));
  };

  const revert = (key: keyof User) => {
    if ((pending.current.get(key) ?? 0) > 0) return;
    patchLocal({ [key]: saved.current[key] ?? null }, true);
  };

  const fail = (key: keyof User) => {
    track(key, -1);
    revert(key);
  };

  const save = async (key: keyof User, value: SettingValue) => {
    const invalid = settingErrorOf(key, value);
    setErrors((prev) => ({ ...prev, [key]: invalid ?? "" }));
    if (invalid !== null) {
      fail(key);
      showToast({ type: "error", title: t("errors.validationError"), message: invalid });
      return;
    }

    const isSaved = await persist(
      { [key]: value },
      {
        label: `setting ${String(key)}`,
        saved: { title: t("settings.settingsSaved") },
        onSaved: () => {
          track(key, -1);
          saved.current = applyPatch(saved.current, { [key]: value });
        },
      },
    );
    if (!isSaved) fail(key);
  };

  const enqueue = (key: keyof User, value: SettingValue) => {
    track(key, 1);
    queue.current = queue.current.then(() => save(key, value));
  };

  const change = (key: keyof User, value: SettingValue) => {
    if ((latest.current[key] ?? null) === value) return;
    patchLocal({ [key]: value }, true);
    enqueue(key, value);
  };

  const slide = (id: SliderSettingId, value: number) =>
    patchLocal(accountPatch(id, value, latest.current), false);

  const commit = (id: SliderSettingId) => {
    const key = QUICK_SETTINGS[id].userKey;
    const value = latest.current[key] ?? null;
    if (value === (committed.current[key] ?? null)) return;
    committed.current = applyPatch(committed.current, { [key]: value });
    enqueue(key, value);
  };

  return { current, errors, change, slide, commit };
};
