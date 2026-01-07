"use client";

import { cn } from "@/app/_utils/global-utils";
import { DynamicLogo } from "@/app/_components/GlobalComponents/Layout/Logo/DynamicLogo";
import { AppName } from "@/app/_components/GlobalComponents/Layout/AppName";
import { usePathname, useRouter } from "next/navigation";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSettingsSidebar } from "@/app/_hooks/useSettingsSidebar";
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
    FileScriptIcon,
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
    const router = useRouter();
    const { checkNavigation } = useNavigationGuard();
    const { isDemoMode, isRwMarkable, appSettings, user } = useAppMode();
    const { sidebarWidth, isResizing, startResizing } = useSettingsSidebar();

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

    const handleNavigate = (path: string) => {
        checkNavigation(() => {
            router.push(path);
            if (window.innerWidth < 1024) {
                onClose();
            }
        });
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
        <>
            <div
                className={cn(
                    "jotty-sidebar-overlay fixed inset-0 z-40 bg-black/50 lg:hidden",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />
            <aside
                style={
                    {
                        "--sidebar-desktop-width": `${sidebarWidth}px`,
                        transition: isResizing ? "none" : undefined,
                    } as React.CSSProperties
                }
                className={cn(
                    "jotty-sidebar rounded-tr-[0.25em] rounded-br-[0.25em] fixed left-0 top-0 z-50 h-full bg-background border-r border-border flex flex-col lg:static",
                    "transition-transform duration-300 ease-in-out",
                    "w-[88vw]",
                    "lg:w-[var(--sidebar-desktop-width)] lg:min-w-[var(--sidebar-desktop-width)] lg:max-w-[var(--sidebar-desktop-width)]",
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
                    "flex-none"
                )}
            >
                <div
                    className="jotty-sidebar-resize-handle absolute top-0 right-0 w-2 h-full cursor-ew-resize hidden lg:block hover:bg-primary/10"
                    onMouseDown={startResizing}
                />

                <div className="jotty-sidebar-content flex flex-col h-full">
                    <div className="jotty-sidebar-header p-6 border-b border-border">
                        <div className="flex items-center justify-between">
                            <a href="/" className="flex items-center gap-3">
                                <DynamicLogo className="h-8 w-8" size="32x32" />
                                <div className="flex items-center gap-2">
                                    <AppName
                                        className="text-xl font-bold text-foreground jotty-app-name"
                                        fallback={isRwMarkable ? "rwMarkable" : "jotty·page"}
                                    />
                                    {isDemoMode && (
                                        <span className="text-sm text-muted-foreground font-medium">
                                            (demo)
                                        </span>
                                    )}
                                </div>
                            </a>
                        </div>
                    </div>

                    <div className="jotty-sidebar-categories flex-1 overflow-y-auto hide-scrollbar p-2 space-y-4">
                        <div className="px-2 pt-2">
                            <div className="flex items-center justify-between">
                                <h3 className="jotty-sidebar-categories-title text-xs font-bold uppercase text-muted-foreground tracking-wider">
                                    {t("common.settings")}
                                </h3>
                            </div>
                        </div>

                        {sections.map((section) => {
                            const isCollapsed = section.id === "profile" ? profileCollapsed : adminCollapsed;
                            const ChevronIcon = isCollapsed ? ArrowRight01Icon : ArrowDown01Icon;

                            return (
                                <div key={section.id} className="space-y-1">
                                    <button
                                        onClick={() => toggleSection(section.id)}
                                        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent rounded-jotty transition-colors"
                                    >
                                        <span>{section.label}</span>
                                        <ChevronIcon className="h-4 w-4 text-muted-foreground" />
                                    </button>

                                    {!isCollapsed && (
                                        <div className="space-y-0.5 pl-2">
                                            {section.items.map((item) => {
                                                const Icon = item.icon;
                                                const isActive = isItemActive(item.path);

                                                return (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => handleNavigate(item.path)}
                                                        className={cn(
                                                            "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-jotty transition-colors",
                                                            isActive
                                                                ? "bg-primary text-primary-foreground font-medium"
                                                                : "text-foreground hover:bg-accent"
                                                        )}
                                                    >
                                                        <Icon className="h-4 w-4 flex-shrink-0" />
                                                        <span className="truncate text-left">{item.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </aside>
        </>
    );
};
