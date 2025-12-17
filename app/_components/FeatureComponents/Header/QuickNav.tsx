"use client";

import {
  CheckmarkSquare04Icon,
  File02Icon,
  SidebarLeftIcon,
  Settings01Icon,
  ShieldUserIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useRouter } from "next/navigation";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { AppMode } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { cn } from "@/app/_utils/global-utils";
import { NavigationGlobalIcon } from "../Navigation/Parts/NavigationGlobalIcon";
import { NavigationSearchIcon } from "../Navigation/Parts/NavigationSearchIcon";
import { NavigationLogoutIcon } from "../Navigation/Parts/NavigationLogoutIcon";
import { NavigationHelpIcon } from "../Navigation/Parts/NavigationHelpIcon";

interface QuickNavProps {
  showSidebarToggle?: boolean;
  onSidebarToggle?: () => void;
  onOpenSettings?: () => void;
  isAdmin: boolean;
  onModeChange?: (mode: AppMode) => void;
}

export const QuickNav = ({
  showSidebarToggle = false,
  onSidebarToggle,
  onOpenSettings,
  isAdmin,
  onModeChange,
}: QuickNavProps) => {
  const router = useRouter();
  const { mode } = useAppMode();
  const { checkNavigation } = useNavigationGuard();

  return (
    <header className="lg:border-b lg:border-border no-print">
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t bg-background",
          "lg:relative lg:h-auto lg:justify-end lg:border-t-0 lg:px-6 lg:py-5"
        )}
      >
        {showSidebarToggle && onSidebarToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSidebarToggle}
            className="text-muted-foreground hover:text-foreground lg:hidden"
          >
            <SidebarLeftIcon className="h-5 w-5" />
          </Button>
        )}

        <div className="hidden lg:flex lg:items-center lg:gap-2">
          <NavigationSearchIcon onModeChange={onModeChange} />

          <NavigationHelpIcon />

          {onOpenSettings && (
            <NavigationGlobalIcon
              icon={<Settings01Icon className="h-5 w-5" />}
              onClick={() => checkNavigation(() => onOpenSettings())}
            />
          )}

          {isAdmin && (
            <NavigationGlobalIcon
              icon={<ShieldUserIcon className="h-5 w-5" />}
              onClick={() => checkNavigation(() => router.push("/admin"))}
            />
          )}

          <NavigationLogoutIcon />
        </div>

        <div className="contents lg:hidden">
          <NavigationGlobalIcon
            icon={
              <CheckmarkSquare04Icon
                className={cn(
                  "h-5 w-5",
                  mode === Modes.CHECKLISTS
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              />
            }
            onClick={() =>
              checkNavigation(() => {
                onModeChange?.(Modes.CHECKLISTS);
                router.push("/");
              })
            }
          />

          <NavigationGlobalIcon
            icon={
              <File02Icon
                className={cn(
                  "h-5 w-5",
                  mode === Modes.NOTES
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              />
            }
            onClick={() =>
              checkNavigation(() => {
                onModeChange?.(Modes.NOTES);
                router.push("/");
              })
            }
          />

          <NavigationSearchIcon onModeChange={onModeChange} />
        </div>
      </nav>
    </header>
  );
};
