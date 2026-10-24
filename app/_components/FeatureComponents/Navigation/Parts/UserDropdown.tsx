"use client";

import { useRef, useState, useEffect } from "react";
import {
  Settings01Icon,
  Logout01Icon,
  HelpCircleIcon,
  ArrowDown01Icon,
  LaptopPhoneSyncIcon,
  TranslateIcon,
  Archive02Icon,
  LicenseDraftIcon,
  AiBrain04Icon,
  Attachment01Icon,
} from "hugeicons-react";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { useRouter } from "next/navigation";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { logout } from "@/app/_server/actions/auth";
import { useTranslations } from "next-intl";
import { NavigationHelpIcon } from "./NavigationHelpIcon";
import { LanguageSubmenu } from "./LanguageSubmenu";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { AboutModal } from "@/app/_components/GlobalComponents/Modals/AboutModal";
import { JottyIcon } from "@/app/_components/GlobalComponents/Layout/CustomIcons/JottyIcon";
import { cn } from "@/app/_utils/global-utils";
import { ARCHIVE_PATH } from "@/app/_consts/files";
import { TEMPLATES_PATH } from "@/app/_consts/templates";
import { BRAIN_PATH } from "@/app/_consts/relations";
import { ATTACHMENTS_PATH } from "@/app/_consts/attachments";
import {
  MENU_CLASS,
  MENU_DIVIDER_CLASS,
  MENU_ITEM_CLASS,
  MENU_ITEM_DANGER_CLASS,
} from "@/app/_consts/styling";

interface UserDropdownProps {
  username: string;
  avatarUrl?: string | null;
  onOpenSettings: () => void;
  currentLocale: string;
}

export const UserDropdown = ({
  username,
  avatarUrl,
  onOpenSettings,
  currentLocale,
}: UserDropdownProps) => {
  const router = useRouter();
  const { checkNavigation } = useNavigationGuard();
  const t = useTranslations();
  const helpIconRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showLanguageSubmenu, setShowLanguageSubmenu] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const { appSettings } = useAppMode();

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  const handleHelp = () => {
    helpIconRef.current?.querySelector("button")?.click();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsDropdownOpen(false);
        setShowLanguageSubmenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showLanguageSubmenu) {
          setShowLanguageSubmenu(false);
        } else {
          setIsDropdownOpen(false);
        }
      }
    };

    if (isDropdownOpen || showLanguageSubmenu) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isDropdownOpen, showLanguageSubmenu]);

  const dropdownItems = [
    {
      label: t("profile.settingsDashboard"),
      icon: <Settings01Icon className="h-4 w-4" />,
      onClick: () => checkNavigation(() => router.push("/settings/user-info")),
    },
    {
      label: t("profile.deviceSettings"),
      icon: <LaptopPhoneSyncIcon className="h-4 w-4" />,
      onClick: () => checkNavigation(() => onOpenSettings()),
    },
    {
      type: "divider" as const,
    },
    {
      label: t("templates.title"),
      icon: <LicenseDraftIcon className="h-4 w-4" />,
      onClick: () => checkNavigation(() => router.push(TEMPLATES_PATH)),
    },
    {
      label: t("profile.archiveTab"),
      icon: <Archive02Icon className="h-4 w-4" />,
      onClick: () => checkNavigation(() => router.push(ARCHIVE_PATH)),
    },
    ...(appSettings?.editor?.enableBilateralLinks === false
      ? []
      : [
          {
            label: t("brain.title"),
            icon: <AiBrain04Icon className="h-4 w-4" />,
            onClick: () => checkNavigation(() => router.push(BRAIN_PATH)),
          },
        ]),
    {
      label: t("attachments.title"),
      icon: <Attachment01Icon className="h-4 w-4" />,
      onClick: () => checkNavigation(() => router.push(ATTACHMENTS_PATH)),
    },
    {
      type: "divider" as const,
    },
    ...(appSettings?.hideLanguageSelector === "yes"
      ? []
      : [
          {
            label: t("common.language"),
            icon: <TranslateIcon className="h-4 w-4" />,
            onClick: () => {
              setShowLanguageSubmenu(true);
            },
            className: showLanguageSubmenu ? "bg-accent" : "",
          },
        ]),
    {
      label: t("common.help"),
      icon: <HelpCircleIcon className="h-4 w-4" />,
      onClick: handleHelp,
    },
    {
      type: "divider" as const,
    },
    {
      label: t("common.about"),
      icon: <JottyIcon className="h-4 w-4" />,
      onClick: () => setShowAboutModal(true),
    },
    {
      type: "divider" as const,
    },
    {
      label: t("common.logout"),
      icon: <Logout01Icon className="h-4 w-4" />,
      onClick: handleLogout,
      variant: "destructive" as const,
    },
  ];

  return (
    <>
      <div ref={helpIconRef} className="hidden">
        <NavigationHelpIcon />
      </div>

      <div className="relative" ref={dropdownRef}>
        <div
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="cursor-pointer"
        >
          <div className="flex items-center gap-1.5 transition-opacity px-2 py-1.5 rounded-jotty lg:hover:bg-accent group">
            <div className="hidden sm:block">
              <UserAvatar username={username} avatarUrl={avatarUrl} size="sm" />
            </div>
            <div className="block sm:hidden">
              <UserAvatar username={username} avatarUrl={avatarUrl} size="lg" />
            </div>
            <span className="text-md lg:text-sm font-medium text-foreground hidden sm:inline-block group-hover:text-accent-foreground">
              {username}
            </span>
            <ArrowDown01Icon className="h-4 w-4 text-muted-foreground hidden sm:block group-hover:text-accent-foreground" />
          </div>
        </div>

        {isDropdownOpen && !showLanguageSubmenu && (
          <div className={cn("absolute right-0 top-full mt-1 w-56 z-50 flex flex-col gap-px p-1", MENU_CLASS)}>
            {dropdownItems.map((item, index) => {
              if (item.type === "divider") {
                return <div key={index} className={MENU_DIVIDER_CLASS} />;
              }

              return (
                <button
                  key={index}
                  onClick={() => {
                    if (item.label === t("common.language")) {
                      setShowLanguageSubmenu(true);
                    } else {
                      item.onClick?.();
                      setIsDropdownOpen(false);
                    }
                  }}
                  className={cn(
                    "group jotty-user-menu-dropdown-item",
                    MENU_ITEM_CLASS,
                    item.variant === "destructive" && MENU_ITEM_DANGER_CLASS,
                    item.className,
                  )}
                >
                  {item.icon && (
                    <span className="flex-shrink-0 w-4 h-4">{item.icon}</span>
                  )}
                  <span className="flex-grow">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {showLanguageSubmenu && (
          <LanguageSubmenu
            currentLocale={currentLocale}
            onClose={() => {
              setShowLanguageSubmenu(false);
              setIsDropdownOpen(false);
            }}
            onBack={() => setShowLanguageSubmenu(false)}
          />
        )}
      </div>

      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />
    </>
  );
};
