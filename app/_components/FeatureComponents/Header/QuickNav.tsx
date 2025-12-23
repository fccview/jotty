"use client";

import {
  CheckmarkSquare04Icon,
  File02Icon,
  SidebarLeftIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useRouter } from "next/navigation";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { AppMode, User } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { cn } from "@/app/_utils/global-utils";
import { NavigationGlobalIcon } from "../Navigation/Parts/NavigationGlobalIcon";
import { NavigationSearchIcon } from "../Navigation/Parts/NavigationSearchIcon";
import { NavigationHelpIcon } from "../Navigation/Parts/NavigationHelpIcon";
import { UserDropdown } from "../Navigation/Parts/UserDropdown";

interface QuickNavProps {
  showSidebarToggle?: boolean;
  onSidebarToggle?: () => void;
  onOpenSettings?: () => void;
  user: User | null;
  onModeChange?: (mode: AppMode) => void;
}

export const QuickNav = ({
  showSidebarToggle = false,
  onSidebarToggle,
  onOpenSettings,
  user,
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
            className="lg:hidden jotty-mobile-navigation-icon"
          >
            <SidebarLeftIcon className="h-5 w-5" />
          </Button>
        )}

        <div className="hidden lg:flex lg:items-center lg:gap-2">
          <NavigationSearchIcon onModeChange={onModeChange} />

          {user && onOpenSettings && (
            <UserDropdown
              username={user.username}
              avatarUrl={user.avatarUrl}
              isAdmin={user.isAdmin}
              onOpenSettings={onOpenSettings}
            />
          )}
        </div>

        <div className="contents lg:hidden">
          <NavigationGlobalIcon
            icon={
              <CheckmarkSquare04Icon
                className={cn(
                  "h-5 w-5",
                  mode === Modes.CHECKLISTS ? "text-primary" : ""
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
                  mode === Modes.NOTES ? "text-primary" : ""
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
