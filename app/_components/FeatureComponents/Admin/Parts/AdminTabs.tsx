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
import { AdminTabs as AdminTabsEnum } from "@/app/_types/enums";
interface AdminTabsProps {
  activeTab: AdminTabsEnum;
  onTabChange: (tab: AdminTabsEnum) => void;
}

export const AdminTabs = ({ activeTab, onTabChange }: AdminTabsProps) => {
  const tabs = [
    {
      id: AdminTabsEnum.OVERVIEW,
      label: "Overview",
      icon: Activity,
    },
    {
      id: AdminTabsEnum.USERS,
      label: "Users",
      icon: Users,
    },
    {
      id: AdminTabsEnum.CONTENT,
      label: "Content",
      icon: FileText,
    },
    {
      id: AdminTabsEnum.SHARING,
      label: "Sharing",
      icon: Globe,
    },
    {
      id: AdminTabsEnum.EDITOR,
      label: "Editor",
      icon: Edit3,
    },
    {
      id: AdminTabsEnum.STYLING,
      label: "Styling",
      icon: Palette,
    },
    {
      id: AdminTabsEnum.SETTINGS,
      label: "Settings",
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
