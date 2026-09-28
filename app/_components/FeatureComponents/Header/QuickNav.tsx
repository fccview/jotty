"use client";

import {
  CheckmarkSquare04Icon,
  File02Icon,
  GridIcon,
  Logout01Icon,
  SidebarLeftIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useRouter } from "next/navigation";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { AppMode, User, SanitisedUser } from "@/app/_types";
import { BottomBarSpaces, Modes } from "@/app/_types/enums";
import { cn, handleScroll } from "@/app/_utils/global-utils";
import { NavigationGlobalIcon } from "../Navigation/Parts/NavigationGlobalIcon";
import { NavigationSearchIcon } from "../Navigation/Parts/NavigationSearchIcon";
import { UserDropdown } from "../Navigation/Parts/UserDropdown";
import { NotificationBell } from "../Notifications/NotificationBell";
import { logout } from "@/app/_server/actions/auth";
import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useBottomBarSpace } from "@/app/_hooks/useBottomBarSpace";

const FLOATING_GAP = "2.5rem";

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
  const { mode, tagsEnabled, tagsIndex } = useAppMode();
  const { checkNavigation } = useNavigationGuard();
  const totalTags = Object.keys(tagsIndex).length;
  const showTagsTab = tagsEnabled && totalTags > 0;
  const t = useTranslations();
  const [isScrolled, setIsScrolled] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const lastScrollY = useRef(0);
  const navRef = useRef<HTMLElement>(null);


  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  useEffect(() => {
    const handleGlobalScroll = (e: Event) => {
      handleScroll(e, "jotty-scrollable-content", setIsScrolled, lastScrollY);
      const target = e.target as HTMLElement;
      if (target.classList?.contains("jotty-scrollable-content")) {
        setIsAtTop(target.scrollTop <= 0);
      }
    };

    window.addEventListener("scroll", handleGlobalScroll, true);

    return () => {
      window.removeEventListener("scroll", handleGlobalScroll, true);
    };
  }, []);

  const isDocked = isAtTop && !isEditorInEditMode;

  useBottomBarSpace(navRef, BottomBarSpaces.QUICK_NAV, {
    enabled: !isEditorInEditMode,
    offset: FLOATING_GAP,
  });

  const mobileClasses =
    "max-w-[80%] w-full rounded-jotty left-[10%] border bg-muted text-muted-foreground";
  const dockedClasses =
    "bottom-0 left-0 max-w-full rounded-none border-x-0 border-b-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]";
  const desktopClasses =
    "lg:max-w-full lg:left-auto lg:rounded-none lg:border-none lg:bg-background";

  return (
    <header className="lg:border-b lg:border-border no-print">
      <nav
        ref={navRef}
        className={cn(
          "jotty-quick-nav fixed z-30 flex items-center justify-between p-2 lg:justify-around transition-[bottom,left,max-width,border-radius,padding] duration-300 ease-in-out",
          "lg:relative lg:bottom-auto lg:h-auto lg:justify-end lg:px-6 lg:py-5",
          mobileClasses,
          desktopClasses,
          isScrolled && !isEditorInEditMode ? "bottom-10" : "-bottom-20",
          isDocked && dockedClasses,
          isEditorInEditMode && "lg:relative lg:bottom-auto",
        )}
      >
        {showSidebarToggle && onSidebarToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSidebarToggle}
            className="lg:hidden jotty-mobile-navigation-icon"
            aria-label={t("common.toggleSidebar")}
          >
            <SidebarLeftIcon className="h-6 w-6" />
          </Button>
        )}

        <div className="hidden lg:flex lg:items-center lg:gap-2">
          <NavigationSearchIcon onModeChange={onModeChange} />
          {user && <NotificationBell />}

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
              aria-label={t("common.logout")}
            >
              <Logout01Icon className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="contents lg:hidden">
          {(user?.landingPage === Modes.NOTES
            ? ([Modes.NOTES, Modes.CHECKLISTS] as AppMode[])
            : ([Modes.CHECKLISTS, Modes.NOTES] as AppMode[])
          ).map((modeOption) => (
            <NavigationGlobalIcon
              key={modeOption}
              icon={
                modeOption === Modes.CHECKLISTS ? (
                  <CheckmarkSquare04Icon
                    className={cn(
                      "h-10 w-10 p-2 rounded-jotty",
                      mode === Modes.CHECKLISTS
                        ? "bg-primary text-primary-foreground"
                        : "",
                    )}
                  />
                ) : (
                  <File02Icon
                    className={cn(
                      "h-10 w-10 p-2 rounded-jotty",
                      mode === Modes.NOTES
                        ? "bg-primary text-primary-foreground"
                        : "",
                    )}
                  />
                )
              }
              onClick={() =>
                checkNavigation(() => {
                  onModeChange?.(modeOption);
                  router.push(`/?mode=${modeOption}`);
                })
              }
            />
          ))}

          {showTagsTab && (
            <NavigationGlobalIcon
              icon={
                <GridIcon
                  className={cn(
                    "h-10 w-10 p-2 rounded-jotty",
                    mode === Modes.TAGS
                      ? "bg-primary text-primary-foreground"
                      : "",
                  )}
                />
              }
              onClick={() =>
                checkNavigation(() => {
                  onModeChange?.(Modes.TAGS);
                  router.push("/?mode=tags");
                })
              }
            />
          )}

          <NavigationSearchIcon onModeChange={onModeChange} />
        </div>
      </nav>
    </header>
  );
};
