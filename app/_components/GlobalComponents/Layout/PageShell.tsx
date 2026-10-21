"use client";

import { useLocale } from "next-intl";
import { ReactNode } from "react";
import { Category, SanitisedUser } from "@/app/_types";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { Layout } from "./Layout";
import { MobileHeader } from "./MobileHeader";

interface PageShellProps {
  categories: Category[];
  user: SanitisedUser | null;
  onOpenCreateModal: (initialCategory?: string) => void;
  onCategoryDeleted?: (categoryName: string) => void;
  onCategoryRenamed?: (oldName: string, newName: string) => void;
  children: ReactNode;
}

export const PageShell = ({
  categories,
  user,
  onOpenCreateModal,
  onCategoryDeleted,
  onCategoryRenamed,
  children,
}: PageShellProps) => {
  const locale = useLocale();
  const { openSettings, openCreateCategoryModal } = useShortcut();

  return (
    <Layout
      categories={categories}
      onOpenSettings={openSettings}
      onOpenCreateModal={onOpenCreateModal}
      onOpenCategoryModal={openCreateCategoryModal}
      user={user}
      onCategoryDeleted={onCategoryDeleted}
      onCategoryRenamed={onCategoryRenamed}
    >
      <MobileHeader
        user={user}
        onOpenSettings={openSettings}
        currentLocale={locale}
      />
      {children}
    </Layout>
  );
};
