"use client";

import { ReactNode } from "react";
import { Layout } from "@/app/_components/GlobalComponents/Layout/Layout";
import { MobileHeader } from "@/app/_components/GlobalComponents/Layout/MobileHeader";
import { Category, SanitisedUser } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";

interface BrowseLayoutProps {
  mode: Modes.NOTES | Modes.CHECKLISTS;
  categories: Category[];
  user: SanitisedUser | null;
  children: ReactNode;
}

export const BrowseLayout = ({ mode, categories, user, children }: BrowseLayoutProps) => {
  const {
    openSettings,
    openCreateNoteModal,
    openCreateChecklistModal,
    openCreateCategoryModal,
  } = useShortcut();

  return (
    <Layout
      categories={categories}
      onOpenSettings={openSettings}
      onOpenCreateModal={mode === Modes.NOTES ? openCreateNoteModal : openCreateChecklistModal}
      onOpenCategoryModal={openCreateCategoryModal}
      user={user}
    >
      <MobileHeader
        user={user}
        onOpenSettings={openSettings}
        currentLocale={user?.preferredLocale || "en"}
      />
      <div className="h-full overflow-y-auto bg-background jotty-scrollable-content jotty-quick-nav-gutter">
        <div className="max-w-full pt-6 pb-4 px-4 lg:pt-10 lg:pb-12 lg:px-8">{children}</div>
      </div>
    </Layout>
  );
};
