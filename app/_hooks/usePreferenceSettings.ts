"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { User, UserSettingsPatch } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useToast } from "@/app/_providers/ToastProvider";
import { updateUserSettings } from "@/app/_server/actions/users";
import { HOME_WIDGET_KEYS } from "@/app/_consts/home";
import { EDITABLE_SETTING_KEYS } from "@/app/_consts/user-settings";
import { QUICK_SETTINGS, SliderSettingId, accountPatch } from "@/app/_consts/quick-settings";
import {
  checklistSettingsSchema,
  editorSettingsSchema,
  generalSettingsSchema,
  homeWidgetsSettingsSchema,
  kanbanSettingsSchema,
} from "@/app/_schemas/user-schemas";
import { applyPatch, mergeIncoming, storedSettingsOf } from "@/app/_utils/preference-utils";

type SettingsSchema =
  | typeof generalSettingsSchema
  | typeof editorSettingsSchema
  | typeof checklistSettingsSchema
  | typeof kanbanSettingsSchema
  | typeof homeWidgetsSettingsSchema;

type Settings = Partial<User>;
type SettingValue = User[keyof User] | null;

const SECTION_KEYS: [SettingsSchema, (keyof User)[]][] = [
  [
    generalSettingsSchema,
    [
      "preferredLocale",
      "preferredTheme",
      "preferredBorderRadius",
      "landingPage",
      "fileRenameMode",
      "preferredDateFormat",
      "preferredTimeFormat",
      "firstDayOfWeek",
      "handedness",
      "hideConnectionIndicator",
      "searchMode",
    ],
  ],
  [
    editorSettingsSchema,
    [
      "notesAutoSaveInterval",
      "notesDefaultMode",
      "notesFontSize",
      "browseViewMode",
      "notesCardPreview",
      "notesCompactMode",
      "notesDefaultEditor",
      "tableSyntax",
      "disableRichEditor",
      "defaultNoteFilter",
      "markdownTheme",
      "codeBlockStyle",
      "quickCreateNotes",
      "quickCreateNotesCategory",
    ],
  ],
  [
    checklistSettingsSchema,
    [
      "enableRecurrence",
      "showCompletedSuggestions",
      "showChecklistEmojis",
      "defaultChecklistFilter",
      "checklistItemClickAction",
      "newItemInsertion",
    ],
  ],
  [
    kanbanSettingsSchema,
    ["kanbanColumnWidth", "hideStatusOnCards", "hideMobileStatusDropdown", "hideTimeTrackingOnCards"],
  ],
  [homeWidgetsSettingsSchema, [...HOME_WIDGET_KEYS]],
];

const SETTING_SCHEMAS = new Map<keyof User, SettingsSchema>(
  SECTION_KEYS.flatMap(([schema, keys]) => keys.map((key) => [key, schema] as const)),
);

const validationError = (key: keyof User, value: SettingValue): string | null => {
  if (value === null) return null;
  const parsed = SETTING_SCHEMAS.get(key)?.partial().safeParse({ [key]: value });
  if (!parsed || parsed.success) return null;
  return parsed.error.issues[0]?.message || "";
};

export const usePreferenceSettings = () => {
  const t = useTranslations();
  const router = useRouter();
  const { showToast } = useToast();
  const { user, setUser } = useAppMode();
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

  const fail = (key: keyof User, title: string, message: string) => {
    track(key, -1);
    revert(key);
    showToast({ type: "error", title, message });
  };

  const save = async (key: keyof User, value: SettingValue) => {
    const invalid = validationError(key, value);
    setErrors((prev) => ({ ...prev, [key]: invalid ?? "" }));
    if (invalid !== null) {
      fail(key, t("errors.validationError"), invalid);
      return;
    }

    try {
      const result = await updateUserSettings({ [key]: value });
      if (!result.success || !result.data?.user) {
        console.error(`Failed to save setting ${String(key)}:`, result.error);
        fail(key, t("settings.settingsSaveFailed"), result.error || t("settings.settingsSaveFailedDescription"));
        return;
      }

      track(key, -1);
      saved.current = applyPatch(saved.current, { [key]: value });
      setUser(result.data.user);
      router.refresh();
      showToast({ type: "success", title: t("settings.settingsSaved") });
    } catch (error) {
      console.error(`Failed to save setting ${String(key)}:`, error);
      fail(key, t("settings.settingsSaveFailed"), t("settings.settingsSaveFailedDescription"));
    }
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
