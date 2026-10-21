"use client";

import { useTranslations } from "next-intl";
import { useSettings } from "@/app/_utils/settings-store";
import { VIEW_MODE_OPTIONS } from "@/app/_consts/view-modes";
import { Button } from "./Button";

export const ViewModeSwitch = () => {
  const t = useTranslations();
  const { viewMode, setViewMode } = useSettings();

  return (
    <div
      className="jotty-view-mode-switch flex gap-1 border border-border rounded-jotty p-0.5 shrink-0"
      role="group"
      aria-label={t("settingsModal.viewMode")}
    >
      {VIEW_MODE_OPTIONS.map(({ id, icon: Icon, labelKey }) => (
        <Button
          key={id}
          variant={viewMode === id ? "default" : "ghost"}
          size="sm"
          className="text-xs h-8 lg:h-7 px-2.5"
          onClick={() => setViewMode(id)}
          aria-pressed={viewMode === id}
          title={t(labelKey)}
        >
          <Icon className="h-3.5 w-3.5 sm:mr-1 shrink-0" />
          <span className="hidden sm:inline">{t(labelKey)}</span>
        </Button>
      ))}
    </div>
  );
};
