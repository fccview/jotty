"use client";

import { useState, useMemo } from "react";
import { QuickNav } from "@/app/_components/FeatureComponents/Header/QuickNav";
import { Sidebar } from "@/app/_components/FeatureComponents/Sidebar/Sidebar";
import { Checklist, Category, Note, User } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useMobileGestures } from "@/app/_hooks/useMobileGestures";
import { isMobileDevice } from "@/app/_utils/global-utils";

interface SharingStatus {
  isShared: boolean;
  isPubliclyShared: boolean;
  sharedWith: string[];
}

interface LayoutProps {
  lists: Checklist[];
  docs?: Note[];
  categories: Category[];
  sharingStatuses?: Record<string, SharingStatus>;
  onOpenSettings: () => void;
  onOpenCreateModal: (initialCategory?: string) => void;
  onOpenCategoryModal: (parentCategory?: string) => void;
  onCategoryDeleted?: (categoryName: string) => void;
  onCategoryRenamed?: (oldName: string, newName: string) => void;
  children: React.ReactNode;
  user: User | null;
}

export const Layout = ({
  lists,
  docs,
  categories,
  sharingStatuses,
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

  const notesMemo = useMemo(() => docs || [], [docs]);
  const listsMemo = useMemo(() => lists || [], [lists]);

  if (!isInitialized) {
    return (
      <div className="flex h-screen bg-background w-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background w-full overflow-hidden relative pb-16 lg:pb-0">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenCreateModal={onOpenCreateModal}
        onOpenCategoryModal={onOpenCategoryModal}
        categories={categories}
        checklists={listsMemo}
        notes={notesMemo}
        sharingStatuses={sharingStatuses}
        onCategoryDeleted={onCategoryDeleted}
        onCategoryRenamed={onCategoryRenamed}
        onOpenSettings={onOpenSettings}
        user={user}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <QuickNav
          showSidebarToggle
          onSidebarToggle={() => setSidebarOpen(true)}
          onOpenSettings={onOpenSettings}
          isAdmin={user?.isAdmin || false}
          checklists={listsMemo}
          notes={notesMemo}
          onModeChange={setMode}
        />

        <div className="flex-1 overflow-hidden">{children}</div>
      </main>
    </div>
  );
};
