"use client";

import { cn } from "@/app/_utils/global-utils";
import { DynamicLogo } from "@/app/_components/GlobalComponents/Layout/Logo/DynamicLogo";
import { AppName } from "@/app/_components/GlobalComponents/Layout/AppName";
import { usePathname, useRouter } from "next/navigation";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { useTranslations } from "next-intl";
import { useSettingsSidebar } from "@/app/_hooks/useSettingsSidebar";
import { getHowtoGuides } from "@/app/_utils/howto-utils";
import {
    HelpCircleIcon,
    SquareLock01Icon,
    SmartPhone01Icon,
    PaintBrush04Icon,
    LaptopProgrammingIcon,
    LockKeyIcon,
    TranslationIcon,
    ComputerPhoneSyncIcon,
    ZapIcon,
    GridIcon,
    CodeIcon,
} from "hugeicons-react";

interface HowtoSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const iconMap: Record<string, any> = {
    zap: ZapIcon,
    hash: GridIcon,
    code: CodeIcon,
    paintbrush: PaintBrush04Icon,
    laptop: LaptopProgrammingIcon,
    key: LockKeyIcon,
    computerphone: ComputerPhoneSyncIcon,
    smartphone: SmartPhone01Icon,
    lock: LockKeyIcon,
    squarelock: SquareLock01Icon,
    translation: TranslationIcon,
};

export const HowtoSidebar = ({ isOpen, onClose }: HowtoSidebarProps) => {
    const t = useTranslations();
    const pathname = usePathname();
    const router = useRouter();
    const { checkNavigation } = useNavigationGuard();
    const { isDemoMode, isRwMarkable } = useAppMode();
    const { sidebarWidth, isResizing, startResizing } = useSettingsSidebar();

    const guides = getHowtoGuides(t);

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
                    "jotty-sidebar fixed left-0 top-0 z-50 h-full bg-background border-r border-border flex flex-col lg:static",
                    "transition-transform duration-300 ease-in-out",
                    "w-[80vw]",
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
                                    {t("help.howTo")}
                                </h3>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="space-y-0.5 pl-2">
                                {guides.map((guide) => {
                                    const Icon = iconMap[guide.icon] || HelpCircleIcon;
                                    const isActive = isItemActive(`/howto/${guide.id}`);

                                    return (
                                        <button
                                            key={guide.id}
                                            onClick={() => handleNavigate(`/howto/${guide.id}`)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-jotty transition-colors",
                                                isActive
                                                    ? "bg-primary text-primary-foreground font-medium"
                                                    : "text-foreground hover:bg-accent"
                                            )}
                                        >
                                            <Icon className="h-4 w-4 flex-shrink-0" />
                                            <span className="truncate text-left">{guide.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};
