"use client";

import { SidebarWrapper } from "@/app/_components/GlobalComponents/Sidebar/SidebarWrapper";
import { SidebarItem } from "@/app/_components/GlobalComponents/Sidebar/SidebarItem";
import { usePathname, useRouter } from "next/navigation";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { useTranslations } from "next-intl";
import {
  HOWTO_SECTION_ORDER,
  HowtoSections,
  getHowtoGuides,
} from "@/app/_utils/howto-utils";
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
  RainIcon,
  Wrench01Icon,
  AiBrain04Icon,
  UserMultipleIcon,
  RoboticIcon,
  ToolsIcon,
  BotIcon,
} from "hugeicons-react";

interface HowtoSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SECTION_TITLES: Record<HowtoSections, string> = {
  [HowtoSections.JOTTY]: "help.howToJotty",
  [HowtoSections.MCP]: "help.howToMcp",
};

const iconMap: Record<string, typeof HelpCircleIcon> = {
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
  patch: Wrench01Icon,
  brain: AiBrain04Icon,
  users: UserMultipleIcon,
  robot: RoboticIcon,
  tools: ToolsIcon,
  bot: BotIcon,
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
    <SidebarWrapper isOpen={isOpen} onClose={onClose} title={t("help.howTo")}>
      <div className="space-y-4">
        {HOWTO_SECTION_ORDER.map((section) => (
          <div key={section} className="space-y-1">
            <h3 className="px-2 text-sm lg:text-xs font-bold uppercase text-muted-foreground tracking-wider">
              {t(SECTION_TITLES[section])}
            </h3>
            <div className="space-y-0.5 pl-2">
              {guides
                .filter((guide) => guide.section === section)
                .map((guide) => {
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
        ))}
      </div>
    </SidebarWrapper>
  );
};
