import { File02Icon, Image02Icon, Video02Icon } from "@hugeicons/core-free-icons";
import { useTranslations } from "next-intl";
import type { FileTab } from "@/app/_hooks/useFileManager";
import { PanelTabs } from "@/app/_components/GlobalComponents/Tabs/PanelTabs";

interface FileTabsProps {
  activeTab: FileTab;
  setActiveTab: (tab: FileTab) => void;
}

const ICONS = {
  images: Image02Icon,
  videos: Video02Icon,
  files: File02Icon,
} satisfies Record<FileTab, typeof Image02Icon>;

export const FileTabs = ({ activeTab, setActiveTab }: FileTabsProps) => {
  const t = useTranslations();

  return (
    <PanelTabs
      tabs={(Object.keys(ICONS) as FileTab[]).map((tab) => ({
        id: tab,
        icon: ICONS[tab],
        label: t(`attachments.tabs.${tab}`),
      }))}
      active={activeTab}
      onSelect={setActiveTab}
      label={t("attachments.kinds")}
    />
  );
};
