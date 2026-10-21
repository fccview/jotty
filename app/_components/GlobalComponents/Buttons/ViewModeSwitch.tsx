"use client";

import { useTranslations } from "next-intl";
import { useQuickSetting } from "@/app/_hooks/settings/useQuickSetting";
import { QuickSettingId } from "@/app/_consts/quick-settings";
import { VIEW_MODE_OPTIONS } from "@/app/_consts/view-modes";
import { cn } from "@/app/_utils/global-utils";
import { Button } from "./Button";

interface ViewModeSwitchProps {
  id?: string;
  iconOnly?: boolean;
  isWide?: boolean;
}

export const ViewModeSwitch = ({ id, iconOnly = false, isWide = false }: ViewModeSwitchProps) => {
  const t = useTranslations();
  const { value: viewMode, set: setViewMode } = useQuickSetting(QuickSettingId.VIEW_MODE);
  const isStretched = iconOnly || isWide;

  return (
    <div
      id={id}
      className={cn(
        "jotty-view-mode-switch flex gap-1 border border-border rounded-jotty p-0.5 shrink-0",
        isStretched && "w-full",
      )}
      role="group"
      aria-label={t("settingsModal.viewMode")}
    >
      {VIEW_MODE_OPTIONS.map(({ id: mode, icon: Icon, labelKey }) => (
        <Button
          key={mode}
          variant={viewMode === mode ? "default" : "ghost"}
          size="sm"
          className={cn(
            "text-xs px-2.5",
            isWide ? "h-9 flex-1 gap-2 text-md lg:text-sm" : "h-8 lg:h-7",
            iconOnly && "flex-1",
          )}
          onClick={() => setViewMode(mode)}
          aria-pressed={viewMode === mode}
          title={t(labelKey)}
          aria-label={iconOnly ? t(labelKey) : undefined}
        >
          <Icon className={cn("shrink-0", isWide ? "h-4 w-4" : "h-3.5 w-3.5", !iconOnly && !isWide && "sm:mr-1")} />
          {isWide && t(labelKey)}
          {!iconOnly && !isWide && <span className="hidden sm:inline">{t(labelKey)}</span>}
        </Button>
      ))}
    </div>
  );
};
