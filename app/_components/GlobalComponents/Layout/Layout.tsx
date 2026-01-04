"use client";

import { useState } from "react";
import { QuickNav } from "@/app/_components/FeatureComponents/Header/QuickNav";
import { Sidebar } from "@/app/_components/FeatureComponents/Sidebar/Sidebar";
import { SettingsSidebar } from "@/app/_components/FeatureComponents/Sidebar/SettingsSidebar";
import { Category, User, SanitisedUser } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useMobileGestures } from "@/app/_hooks/useMobileGestures";
import { isMobileDevice } from "@/app/_utils/global-utils";
import { Loading } from "@/app/_components/GlobalComponents/Layout/Loading";
import { usePathname } from "next/navigation";

interface LayoutProps {
  categories: Category[];
  onOpenSettings: () => void;
  onOpenCreateModal: (initialCategory?: string) => void;
  onOpenCategoryModal: (parentCategory?: string) => void;
  onCategoryDeleted?: (categoryName: string) => void;
  onCategoryRenamed?: (oldName: string, newName: string) => void;
  children: React.ReactNode;
  user: SanitisedUser | null;
  customSidebar?: (props: { isOpen: boolean; onClose: () => void }) => React.ReactNode;
}

export const Layout = ({
  categories,
  onOpenSettings,
  onOpenCreateModal,
  onOpenCategoryModal,
  onCategoryDeleted,
  onCategoryRenamed,
  user,
  children,
  customSidebar,
}: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { setMode, isInitialized } = useAppMode();
  const pathname = usePathname();

  const isSettingsPage = pathname?.startsWith("/settings");

  useMobileGestures({
    onSwipeRight: () => setSidebarOpen(true),
    enabled:
      isMobileDevice() && !window?.location.pathname.startsWith("/note/"),
    swipeThreshold: 15,
    edgeThreshold: 400,
    velocityThreshold: 0.02,
  });

  if (!isInitialized) {
    return <Loading />;
  }

  return (
    <div className="jotty-layout flex h-screen bg-background w-full overflow-hidden relative pb-16 lg:pb-0">
      {customSidebar ? (
        customSidebar({ isOpen: sidebarOpen, onClose: () => setSidebarOpen(false) })
      ) : isSettingsPage ? (
        <SettingsSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isAdmin={user?.isAdmin || false}
        />
      ) : (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenCreateModal={onOpenCreateModal}
          onOpenCategoryModal={onOpenCategoryModal}
          categories={categories}
          onCategoryDeleted={onCategoryDeleted}
          onCategoryRenamed={onCategoryRenamed}
          onOpenSettings={onOpenSettings}
          user={user}
        />
      )}

      <main className="jotty-layout-main flex-1 flex flex-col overflow-hidden">
        <QuickNav
          showSidebarToggle
          onSidebarToggle={() => setSidebarOpen(true)}
          onOpenSettings={onOpenSettings}
          user={user}
          currentLocale={user?.preferredLocale || "en"}
          onModeChange={setMode}
        />

        <div className="jotty-layout-content flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};

