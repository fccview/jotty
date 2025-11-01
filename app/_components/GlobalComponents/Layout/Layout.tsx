"use client";

import { useState } from "react";
import { QuickNav } from "@/app/_components/FeatureComponents/Header/QuickNav";
import { Sidebar } from "@/app/_components/FeatureComponents/Sidebar/Sidebar";
import { Category, User } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useMobileGestures } from "@/app/_hooks/useMobileGestures";
import { isMobileDevice } from "@/app/_utils/global-utils";

interface LayoutProps {
  categories: Category[];
  onOpenSettings: () => void;
  onOpenCreateModal: (initialCategory?: string) => void;
  onOpenCategoryModal: (parentCategory?: string) => void;
  onCategoryDeleted?: (categoryName: string) => void;
  onCategoryRenamed?: (oldName: string, newName: string) => void;
  children: React.ReactNode;
  user: User | null;
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
}: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { setMode, isInitialized } = useAppMode();

  useMobileGestures({
    onSwipeRight: () => setSidebarOpen(true),
    enabled:
      isMobileDevice() && !window?.location.pathname.startsWith("/note/"),
    swipeThreshold: 15,
    edgeThreshold: 400,
    velocityThreshold: 0.02,
  });

  if (!isInitialized) {
    return (
      <div className="jotty-layout flex h-screen bg-background w-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="jotty-layout flex h-screen bg-background w-full overflow-hidden relative pb-16 lg:pb-0">
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

      <main className="jotty-layout-main flex-1 flex flex-col overflow-hidden">
        <QuickNav
          showSidebarToggle
          onSidebarToggle={() => setSidebarOpen(true)}
          onOpenSettings={onOpenSettings}
          isAdmin={user?.isAdmin || false}
          onModeChange={setMode}
        />

        <div className="jotty-layout-content flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};
