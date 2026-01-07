"use client";

import { CheckmarkSquare04Icon, File02Icon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { cn } from "@/app/_utils/global-utils";
import { AppMode } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useTranslations } from "next-intl";

interface SidebarNavigationProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

interface ModeOption {
  id: AppMode;
  label: string;
  icon: React.ElementType;
}

export const SidebarNavigation = ({
  mode,
  onModeChange,
}: SidebarNavigationProps) => {
  const { user } = useAppMode();
  const t = useTranslations();
  const modes: ModeOption[] = [
    {
      id: Modes.CHECKLISTS,
      label: t("checklists.title"),
      icon: CheckmarkSquare04Icon,
    },
    {
      id: Modes.NOTES,
      label: t("notes.title"),
      icon: File02Icon,
    },
  ];

  const orderNote = user?.landingPage === Modes.NOTES ? -1 : 1;
  const orderChecklist = user?.landingPage === Modes.CHECKLISTS ? 0 : 1;

  const orderedModes = modes.sort((a, b) => {
    if (a.id === Modes.NOTES) return orderNote;
    if (a.id === Modes.CHECKLISTS) return orderChecklist;
    return 0;
  });

  return (
    <div className="jotty-sidebar-navigation flex gap-1 p-2 border-b border-border">
      {orderedModes.map((modeOption: ModeOption) => {
        const Icon = modeOption.icon;
        return (
          <Button
            key={modeOption.id}
            variant={mode === modeOption.id ? "default" : "ghost"}
            size="sm"
            onClick={() => onModeChange(modeOption.id)}
            className={cn(
              "flex-1 justify-start gap-2 h-14 lg:h-9 py-6 text-md lg:text-sm",

              mode === modeOption.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-accent-foreground"
            )}
          >
            <Icon className="h-5 w-5 lg:h-4 lg:w-4" />
            {modeOption.label}
          </Button>
        );
      })}
    </div>
  );
};
