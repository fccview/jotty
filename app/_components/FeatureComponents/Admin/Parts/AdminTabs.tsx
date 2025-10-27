"use client";

import { Users, FileText, Activity, Shield, Settings, Edit3 } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { cn } from "@/app/_utils/global-utils";
import { useTranslations } from "next-intl";

type AdminTab = "overview" | "users" | "content" | "sharing" | "settings" | "editor";

interface AdminTabsProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

export const AdminTabs = ({ activeTab, onTabChange }: AdminTabsProps) => {
  const t = useTranslations();

  const tabs = [
    {
      id: "overview" as AdminTab,
      label: t("global.overview"),
      icon: Activity,
    },
    {
      id: "users" as AdminTab,
      label: t("global.users"),
      icon: Users,
    },
    {
      id: "content" as AdminTab,
      label: t("global.content"),
      icon: FileText,
    },
    {
      id: "sharing" as AdminTab,
      label: t("global.sharing"),
      icon: Shield,
    },
    {
      id: "editor" as AdminTab,
      label: t("global.editor"),
      icon: Edit3,
    },
    {
      id: "settings" as AdminTab,
      label: t("global.settings"),
      icon: Settings,
    }
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
