"use client";

import { ComponentType, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/app/_utils/global-utils";

export interface OverrideState {
  isOverridden: boolean;
  canSave: boolean;
  isSaving: boolean;
  onReset: () => void;
  onSave: () => void;
}

interface QuickRowProps extends OverrideState {
  controlId: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  value?: string;
  inline?: ReactNode;
  below?: ReactNode;
}

const LINK_CLASS =
  "rounded-jotty font-medium underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

const OverrideBar = ({ isOverridden, canSave, isSaving, onReset, onSave }: OverrideState) => {
  const t = useTranslations();
  const isVisible = isOverridden && canSave;

  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
        isVisible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
      inert={!isVisible}
    >
      <div className="overflow-hidden">
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm lg:text-xs">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {t("quickSettings.browserOnly")}
          </span>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={cn(LINK_CLASS, "text-primary")}
          >
            {t(isSaving ? "quickSettings.saving" : "quickSettings.saveToAccount")}
          </button>
          <button
            type="button"
            onClick={onReset}
            className={cn(LINK_CLASS, "text-muted-foreground hover:text-foreground")}
          >
            {t("settingsModal.useAccountSetting")}
          </button>
        </div>
      </div>
    </div>
  );
};

export const QuickRow = ({
  controlId,
  icon: Icon,
  label,
  hint,
  value,
  inline,
  below,
  ...override
}: QuickRowProps) => (
  <div className="jotty-quick-row px-6 py-3">
    <div className="flex items-center gap-3 min-h-9">
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-jotty transition-colors",
          override.isOverridden && override.canSave
            ? "bg-primary/10 text-primary"
            : "bg-muted/60 text-muted-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <label
          htmlFor={controlId}
          className="block text-md lg:text-sm font-medium leading-snug text-foreground"
        >
          {label}
        </label>
        {hint && (
          <p className="mt-0.5 text-sm lg:text-xs leading-snug text-muted-foreground">{hint}</p>
        )}
      </div>
      {value !== undefined && (
        <span className="shrink-0 rounded-jotty jotty-value-chip px-2 py-0.5 font-mono text-sm lg:text-xs tabular-nums text-foreground">
          {value}
        </span>
      )}
      {inline}
    </div>
    <div className="pl-11">
      {below && <div className="mt-3">{below}</div>}
      <OverrideBar {...override} />
    </div>
  </div>
);
