"use client";

import { SidebarWrapper } from "@/app/_components/GlobalComponents/Sidebar/SidebarWrapper";
import { SidebarItem } from "@/app/_components/GlobalComponents/Sidebar/SidebarItem";
import { usePathname, useRouter } from "next/navigation";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { useTranslations } from "next-intl";
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
    RainIcon
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
    rain: RainIcon,
};

export const HowtoSidebar = ({ isOpen, onClose }: HowtoSidebarProps) => {
    const t = useTranslations();
    const pathname = usePathname();
    const router = useRouter();
    const { checkNavigation } = useNavigationGuard();

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
        <SidebarWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={t("help.howTo")}
        >
            <div className="space-y-1">
                <div className="space-y-0.5 pl-2">
                    {guides.map((guide) => {
                        const Icon = iconMap[guide.icon] || HelpCircleIcon;
                        const isActive = isItemActive(`/howto/${guide.id}`);

                        return (
                            <SidebarItem
                                href={`/howto/${guide.id}`}
                                key={guide.id}
                                icon={Icon}
                                label={guide.name}
                                isActive={isActive}
                                onClick={() => handleNavigate(`/howto/${guide.id}`)}
                            />
                        );
                    })}
                </div>
            </div>
        </SidebarWrapper>
    );
};
