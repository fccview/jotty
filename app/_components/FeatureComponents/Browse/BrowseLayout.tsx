"use client";

import { ReactNode } from "react";
import { PageShell } from "@/app/_components/GlobalComponents/Layout/PageShell";
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
  const { openCreateNoteModal, openCreateChecklistModal } = useShortcut();

  return (
    <PageShell
      categories={categories}
      user={user}
      onOpenCreateModal={mode === Modes.NOTES ? openCreateNoteModal : openCreateChecklistModal}
    >
      <div className="h-full overflow-y-auto bg-background jotty-scrollable-content jotty-quick-nav-gutter">
        <div className="max-w-full pt-6 pb-4 px-4 lg:pt-10 lg:pb-12 lg:px-8">{children}</div>
      </div>
    </PageShell>
  );
};
