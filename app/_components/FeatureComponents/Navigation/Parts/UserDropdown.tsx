"use client";

import { useRef } from "react";
import { Settings01Icon, ShieldUserIcon, UserIcon, Logout01Icon, HelpCircleIcon, ArrowDown01Icon } from "hugeicons-react";
import { DropdownMenu } from "@/app/_components/GlobalComponents/Dropdowns/DropdownMenu";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { useRouter } from "next/navigation";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { logout } from "@/app/_server/actions/auth";
import { useTranslations } from "next-intl";
import { NavigationHelpIcon } from "./NavigationHelpIcon";

interface UserDropdownProps {
  username: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
  onOpenSettings: () => void;
}

export const UserDropdown = ({
  username,
  avatarUrl,
  isAdmin,
  onOpenSettings,
}: UserDropdownProps) => {
  const router = useRouter();
  const { checkNavigation } = useNavigationGuard();
  const t = useTranslations();
  const helpIconRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  const handleHelp = () => {
    helpIconRef.current?.querySelector('button')?.click();
  };

  const dropdownItems = [
    {
      label: t("profile.userSettings"),
      icon: <UserIcon className="h-4 w-4" />,
      onClick: () => checkNavigation(() => router.push("/profile")),
    },
    {
      label: t("profile.deviceSettings"),
      icon: <Settings01Icon className="h-4 w-4" />,
      onClick: () => checkNavigation(() => onOpenSettings()),
    },
    ...(isAdmin
      ? [
          {
            label: t("profile.adminSettings"),
            icon: <ShieldUserIcon className="h-4 w-4" />,
            onClick: () => checkNavigation(() => router.push("/admin")),
          },
        ]
      : []),
    {
      type: "divider" as const,
    },
    {
      label: t("common.help"),
      icon: <HelpCircleIcon className="h-4 w-4" />,
      onClick: handleHelp,
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

      <DropdownMenu
        align="right"
        trigger={
          <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity px-2 py-1.5 rounded-jotty hover:bg-accent">
            <div className="hidden sm:block">
              <UserAvatar
                username={username}
                avatarUrl={avatarUrl}
                size="sm"
              />
            </div>
            <div className="block sm:hidden">
              <UserAvatar
                username={username}
                avatarUrl={avatarUrl}
                size="md"
              />
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:inline-block">
              {username}
            </span>
            <ArrowDown01Icon className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </div>
        }
        items={dropdownItems}
      />
    </>
  );
};
