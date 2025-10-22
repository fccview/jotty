"use client";

import { Users, FileText, Activity, Shield, Settings } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { cn } from "@/app/_utils/global-utils";

type AdminTab = "overview" | "users" | "content" | "sharing" | "settings";

interface AdminTabsProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

export const AdminTabs = ({ activeTab, onTabChange }: AdminTabsProps) => {
  const tabs = [
    {
      id: "overview" as AdminTab,
      label: "Overview",
      icon: Activity,
    },
    {
      id: "users" as AdminTab,
      label: "Users",
      icon: Users,
    },
    {
      id: "content" as AdminTab,
      label: "Content",
      icon: FileText,
    },
    {
      id: "sharing" as AdminTab,
      label: "Sharing",
      icon: Shield,
    },
    {
      id: "settings" as AdminTab,
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
              className={cn(
                "flex items-center gap-2 flex-shrink-0"
              )}
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
