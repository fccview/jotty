"use client";

import {
  Users,
  FileText,
  Activity,
  Globe,
  Settings,
  Edit3,
  Palette,
} from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { cn } from "@/app/_utils/global-utils";
import { useTranslations } from "next-intl";
import { AdminTabs as AdminTabsEnum } from "@/app/_types/enums";

interface AdminTabsProps {
  activeTab: AdminTabsEnum;
  onTabChange: (tab: AdminTabsEnum) => void;
}

export const AdminTabs = ({ activeTab, onTabChange }: AdminTabsProps) => {
  const t = useTranslations();

  const tabs = [
    {
      id: AdminTabsEnum.OVERVIEW,
      label: t("global.overview"),
      icon: Activity,
    },
    {
      id: AdminTabsEnum.USERS,
      label: t("global.users"),
      icon: Users,
    },
    {
      id: AdminTabsEnum.CONTENT,
      label: t("global.content"),
      icon: FileText,
    },
    {
      id: AdminTabsEnum.SHARING,
      label: t("global.sharing"),
      icon: Globe,
    },
    {
      id: AdminTabsEnum.EDITOR,
      label: t("global.editor"),
      icon: Edit3,
    },
    {
      id: AdminTabsEnum.STYLING,
      label: t("global.styling"),
      icon: Palette,
    },
    {
      id: AdminTabsEnum.SETTINGS,
      label: t("global.settings"),
      icon: Settings,
    },
  ];

  return (
    <div className="bg-muted p-1 rounded-lg">
      <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => onTabChange(tab.id)}
              className={cn("flex items-center gap-2 flex-shrink-0")}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
