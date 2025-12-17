import { cn } from "@/app/_utils/global-utils";
import { Globe02Icon, UserMultipleIcon } from "hugeicons-react";

interface ShareTabsProps {
  activeTab: string;
  setActiveTab: (tab: "users" | "public") => void;
}

export const ShareTabs = ({ activeTab, setActiveTab }: ShareTabsProps) => (
  <div className="flex border-b border-border">
    {(["users", "public"] as const).map((tab) => (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
          activeTab === tab
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        {tab === "users" ? (
          <UserMultipleIcon className="h-4 w-4" />
        ) : (
          <Globe02Icon className="h-4 w-4" />
        )}
        {tab === "users" ? "Share with Users" : "Public Link"}
      </button>
    ))}
  </div>
);
