"use client";

import {
  CheckmarkSquare04Icon,
  File02Icon,
  Logout01Icon,
  SidebarLeftIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useRouter } from "next/navigation";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { AppMode, User, SanitisedUser } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { cn, handleScroll } from "@/app/_utils/global-utils";
import { NavigationGlobalIcon } from "../Navigation/Parts/NavigationGlobalIcon";
import { NavigationSearchIcon } from "../Navigation/Parts/NavigationSearchIcon";
import { UserDropdown } from "../Navigation/Parts/UserDropdown";
import { logout } from "@/app/_server/actions/auth";
import { useState, useEffect, useRef } from "react";

interface QuickNavProps {
  showSidebarToggle?: boolean;
  onSidebarToggle?: () => void;
  onOpenSettings?: () => void;
  user: SanitisedUser | null;
  onModeChange?: (mode: AppMode) => void;
  currentLocale: string;
  isEditorInEditMode?: boolean;
}

export const QuickNav = ({
  showSidebarToggle = false,
  onSidebarToggle,
  onOpenSettings,
  user,
  onModeChange,
  currentLocale,
  isEditorInEditMode = false,
}: QuickNavProps) => {
  const router = useRouter();
  const { mode } = useAppMode();
  const { checkNavigation } = useNavigationGuard();
  const [isScrolled, setIsScrolled] = useState(true);
  const lastScrollY = useRef(0);

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  useEffect(() => {
    const handleGlobalScroll = (e: Event) => {
      handleScroll(e, 'jotty-scrollable-content', setIsScrolled, lastScrollY);
    };

    window.addEventListener('scroll', handleGlobalScroll, true);

    return () => {
      window.removeEventListener('scroll', handleGlobalScroll, true);
    };
  }, []);

  const mobileClasses = "max-w-[80%] w-full rounded-jotty left-[10%] border bg-muted text-muted-foreground";
  const desktopClasses = "lg:max-w-full lg:left-auto lg:rounded-none lg:border-none lg:bg-background"

  return (
    <header className="lg:border-b lg:border-border no-print">
      <nav
        className={cn(
          "fixed z-30 flex items-center justify-between p-2 lg:justify-around transition-[bottom] duration-300 ease-in-out",
          "lg:relative lg:bottom-auto lg:h-auto lg:justify-end lg:px-6 lg:py-5",
          mobileClasses,
          desktopClasses,
          isScrolled && !isEditorInEditMode ? "bottom-10" : "-bottom-20",
          isEditorInEditMode && "lg:relative lg:bottom-auto"
        )}
      >
        {showSidebarToggle && onSidebarToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSidebarToggle}
            className="lg:hidden jotty-mobile-navigation-icon"
          >
            <SidebarLeftIcon className="h-6 w-6" />
          </Button>
        )}

        <div className="hidden lg:flex lg:items-center lg:gap-2">
          <NavigationSearchIcon onModeChange={onModeChange} />

          {user && onOpenSettings ? (
            <UserDropdown
              username={user.username}
              avatarUrl={user.avatarUrl}
              onOpenSettings={onOpenSettings}
              currentLocale={currentLocale}
            />
          ) : (
            <Button
              variant="destructive"
              size="icon"
              onClick={handleLogout}
              className="jotty-mobile-navigation-icon"
            >
              <Logout01Icon className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="contents lg:hidden">
          <NavigationGlobalIcon
            icon={
              <CheckmarkSquare04Icon
                className={cn(
                  "h-10 w-10 p-2 rounded-jotty",
                  mode === Modes.CHECKLISTS ? "bg-primary text-primary-foreground" : ""
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
                  "h-10 w-10 p-2 rounded-jotty",
                  mode === Modes.NOTES ? "bg-primary text-primary-foreground" : ""
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

