"use client";

import { useTranslations } from "next-intl";
import { useQuickSetting } from "@/app/_hooks/useQuickSetting";
import { QuickSettingId } from "@/app/_consts/quick-settings";
import { VIEW_MODE_OPTIONS } from "@/app/_consts/view-modes";
import { Button } from "./Button";

interface ViewModeSwitchProps {
  iconOnly?: boolean;
}

export const ViewModeSwitch = ({ iconOnly = false }: ViewModeSwitchProps) => {
  const t = useTranslations();
  const { value: viewMode, set: setViewMode } = useQuickSetting(QuickSettingId.VIEW_MODE);

  return (
    <div
      className={`jotty-view-mode-switch flex gap-1 border border-border rounded-jotty p-0.5 shrink-0 ${iconOnly ? "w-full" : ""}`}
      role="group"
      aria-label={t("settingsModal.viewMode")}
    >
      {VIEW_MODE_OPTIONS.map(({ id, icon: Icon, labelKey }) => (
        <Button
          key={id}
          variant={viewMode === id ? "default" : "ghost"}
          size="sm"
          className={`text-xs h-8 lg:h-7 px-2.5 ${iconOnly ? "flex-1" : ""}`}
          onClick={() => setViewMode(id)}
          aria-pressed={viewMode === id}
          title={t(labelKey)}
          aria-label={iconOnly ? t(labelKey) : undefined}
        >
          <Icon className={`h-3.5 w-3.5 shrink-0 ${iconOnly ? "" : "sm:mr-1"}`} />
          {!iconOnly && <span className="hidden sm:inline">{t(labelKey)}</span>}
        </Button>
      ))}
    </div>
  );
};
