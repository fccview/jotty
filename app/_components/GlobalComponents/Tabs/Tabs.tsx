import React from "react";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";

interface TabItem {
  id: string;
  name: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabClick: (tabId: string) => void;
}

export const Tabs = ({ tabs, activeTab, onTabClick }: TabsProps) => {
  const dropdownOptions = tabs.map((tab) => ({
    id: tab.id,
    name: tab.name,
    icon: tab.icon ? () => <>{tab.icon}</> : undefined,
  }));

  const activeTabName = tabs.find((tab) => tab.id === activeTab)?.name || "";

  return (
    <div className="flex border-b border-border mb-4 min-h-[40px] relative">
      <div className="hidden lg:flex flex-nowrap overflow-x-auto scrollbar-hide">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => onTabClick(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {tab.icon && tab.icon}
            {tab.name}
          </button>
        ))}
      </div>

      <div className="lg:hidden w-full">
        <Dropdown
          value={activeTab}
          options={dropdownOptions}
          onChange={onTabClick}
          placeholder={activeTabName}
        />
      </div>
    </div>
  );
};
