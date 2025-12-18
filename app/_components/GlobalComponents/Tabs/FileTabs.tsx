import { Image02Icon, File02Icon, Video02Icon } from "hugeicons-react";

interface FileTabsProps {
  activeTab: "images" | "videos" | "files";
  setActiveTab: (tab: "images" | "videos" | "files") => void;
}

export const FileTabs = ({ activeTab, setActiveTab }: FileTabsProps) => (
  <div className="flex border-b border-border">
    {(["images", "videos", "files"] as const).map((tab) => (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
          activeTab === tab
            ? "text-primary-foreground border-b-2 border-primary bg-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          {tab === "images" ? (
            <Image02Icon className="h-4 w-4" />
          ) : tab === "videos" ? (
            <Video02Icon className="h-4 w-4" />
          ) : (
            <File02Icon className="h-4 w-4" />
          )}
          {tab === "images" ? "Images" : tab === "videos" ? "Videos" : "Files"}
        </div>
      </button>
    ))}
  </div>
);
