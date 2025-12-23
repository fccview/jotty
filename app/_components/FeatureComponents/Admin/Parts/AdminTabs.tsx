"use client";

import {
  UserMultipleIcon,
  File02Icon,
  Activity03Icon,
  Globe02Icon,
  Settings01Icon,
  BookEditIcon,
  PaintBrush04Icon,
  FileScriptIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { cn } from "@/app/_utils/global-utils";
import { AdminTabs as AdminTabsEnum } from "@/app/_types/enums";
import { useTranslations } from "next-intl";

interface AdminTabsProps {
  activeTab: AdminTabsEnum;
  onTabChange: (tab: AdminTabsEnum) => void;
}

export const AdminTabs = ({ activeTab, onTabChange }: AdminTabsProps) => {
  const t = useTranslations();

  const tabs = [
    {
      id: AdminTabsEnum.OVERVIEW,
      label: t("admin.overview"),
      icon: Activity03Icon,
    },
    {
      id: AdminTabsEnum.USERS,
      label: t("admin.users"),
      icon: UserMultipleIcon,
    },
    {
      id: AdminTabsEnum.CONTENT,
      label: t("admin.content"),
      icon: File02Icon,
    },
    {
      id: AdminTabsEnum.SHARING,
      label: t("admin.sharing"),
      icon: Globe02Icon,
    },
    {
      id: AdminTabsEnum.AUDIT_LOGS,
      label: t("admin.adminLogs"),
      icon: FileScriptIcon,
    },
    {
      id: AdminTabsEnum.EDITOR,
      label: t("admin.editor"),
      icon: BookEditIcon,
    },
    {
      id: AdminTabsEnum.STYLING,
      label: t("admin.styling"),
      icon: PaintBrush04Icon,
    },
    {
      id: AdminTabsEnum.SETTINGS,
      label: t("common.settings"),
      icon: Settings01Icon,
    },
  ];

  return (
    <div className="bg-muted p-1 rounded-jotty">
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
