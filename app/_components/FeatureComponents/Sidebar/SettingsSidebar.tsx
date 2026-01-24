"use client";

import { SidebarWrapper } from "@/app/_components/GlobalComponents/Sidebar/SidebarWrapper";
import { SidebarItem } from "@/app/_components/GlobalComponents/Sidebar/SidebarItem";
import { usePathname } from "next/navigation";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
    UserIcon,
    Tv02Icon,
    Archive02Icon,
    SharedWifiIcon,
    LockKeyIcon,
    Settings01Icon,
    Activity03Icon,
    UserMultipleIcon,
    File02Icon,
    Globe02Icon,
    BookEditIcon,
    PaintBrush04Icon,
    ArrowDown01Icon,
    ArrowRight01Icon,
    AppleReminderIcon,
    TeachingIcon,
} from "hugeicons-react";

interface SettingsSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    isAdmin: boolean;
}

interface SettingsNavItem {
    id: string;
    label: string;
    icon: any;
    path: string;
}

interface SettingsSection {
    id: string;
    label: string;
    items: SettingsNavItem[];
}

export const SettingsSidebar = ({ isOpen, onClose, isAdmin }: SettingsSidebarProps) => {
    const t = useTranslations();
    const pathname = usePathname();
    const { appSettings, user } = useAppMode();

    const [profileCollapsed, setProfileCollapsed] = useState(false);
    const [adminCollapsed, setAdminCollapsed] = useState(false);

    const isSuperAdmin = user?.isSuperAdmin || false;
    const adminContentAccess = appSettings?.adminContentAccess || "yes";
    const hasContentAccess = isSuperAdmin || adminContentAccess !== "no";

    const profileItems: SettingsNavItem[] = [
        {
            id: "user-info",
            label: t("profile.profileTab"),
            icon: UserIcon,
            path: "/settings/user-info",
        },
        {
            id: "sessions",
            label: t("profile.sessionsTab"),
            icon: Tv02Icon,
            path: "/settings/sessions",
        },
        {
            id: "user-audit-logs",
            label: t("profile.userLogsTab"),
            icon: TeachingIcon,
            path: "/settings/user-audit-logs",
        },
        {
            id: "archive",
            label: t("profile.archiveTab"),
            icon: Archive02Icon,
            path: "/settings/archive",
        },
        ...(appSettings?.editor?.enableBilateralLinks
            ? [
                {
                    id: "connections",
                    label: t("profile.connectionsTab"),
                    icon: SharedWifiIcon,
                    path: "/settings/connections",
                },
            ]
            : []),
        {
            id: "encryption",
            label: t("profile.encryptionTab"),
            icon: LockKeyIcon,
            path: "/settings/encryption",
        },
        {
            id: "user-preferences",
            label: t("profile.userPreferencesTab"),
            icon: Settings01Icon,
            path: "/settings/user-preferences",
        },
    ];

    const allAdminItems: SettingsNavItem[] = [
        {
            id: "overview",
            label: t("admin.overview"),
            icon: Activity03Icon,
            path: "/settings/admin/overview",
        },
        {
            id: "admin-audit-logs",
            label: t("admin.adminLogs"),
            icon: AppleReminderIcon,
            path: "/settings/admin/audit-logs",
        },
        {
            id: "users",
            label: t("admin.users"),
            icon: UserMultipleIcon,
            path: "/settings/admin/users",
        },
        {
            id: "content",
            label: t("admin.content"),
            icon: File02Icon,
            path: "/settings/admin/content",
        },
        {
            id: "sharing",
            label: t("admin.sharing"),
            icon: Globe02Icon,
            path: "/settings/admin/sharing",
        },
        {
            id: "editor",
            label: t("admin.editor"),
            icon: BookEditIcon,
            path: "/settings/admin/editor",
        },
        {
            id: "styling",
            label: t("admin.styling"),
            icon: PaintBrush04Icon,
            path: "/settings/admin/styling",
        },
        {
            id: "site-preferences",
            label: t("admin.appPreferences"),
            icon: Settings01Icon,
            path: "/settings/admin/site-preferences",
        },
    ];

    const adminItems = hasContentAccess
        ? allAdminItems
        : allAdminItems.filter(item => item.id !== "content");

    const sections: SettingsSection[] = [
        {
            id: "profile",
            label: t("profile.userProfile"),
            items: profileItems,
        },
        ...(isAdmin
            ? [
                {
                    id: "admin",
                    label: t("admin.adminDashboard"),
                    items: adminItems,
                },
            ]
            : []),
    ];

    const handleItemClick = () => {
        if (window.innerWidth < 1024) {
            onClose();
        }
    };

    const isItemActive = (path: string) => {
        return pathname === path;
    };

    const toggleSection = (sectionId: string) => {
        if (sectionId === "profile") {
            setProfileCollapsed(!profileCollapsed);
        } else if (sectionId === "admin") {
            setAdminCollapsed(!adminCollapsed);
        }
    };

    return (
        <SidebarWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={t("common.settings")}
        >
            {sections.map((section) => {
                const isCollapsed = section.id === "profile" ? profileCollapsed : adminCollapsed;
                const ChevronIcon = isCollapsed ? ArrowRight01Icon : ArrowDown01Icon;

                return (
                    <div key={section.id} className="space-y-1">
                        <button
                            onClick={() => toggleSection(section.id)}
                            className="w-full flex items-center justify-between px-3 py-2 text-md lg:text-sm font-semibold text-foreground hover:bg-accent rounded-jotty transition-colors"
                        >
                            <span>{section.label}</span>
                            <ChevronIcon className="h-4 w-4 text-muted-foreground" />
                        </button>

                        {!isCollapsed && (
                            <div className="space-y-0.5 pl-2">
                                {section.items.map((item) => (
                                    <SidebarItem
                                        key={item.id}
                                        icon={item.icon}
                                        label={item.label}
                                        isActive={isItemActive(item.path)}
                                        href={item.path}
                                        onClick={handleItemClick}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </SidebarWrapper>
    );
};
