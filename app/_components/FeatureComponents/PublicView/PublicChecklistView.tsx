"use client";

import { Checklist, User } from "@/app/_types";
import { PublicChecklistHeader } from "@/app/_components/FeatureComponents/PublicView/Parts/PublicChecklistHeader";
import { PublicChecklistBody } from "@/app/_components/FeatureComponents/PublicView/Parts/PublicChecklistBody";
import { useTranslations } from "next-intl";

interface PublicChecklistViewProps {
  checklist: Checklist;
  user: User | null;
}

export const PublicChecklistView = ({
  checklist,
  user,
}: PublicChecklistViewProps) => {
  const t = useTranslations();
  let avatarUrl = "";
  if (window && user?.avatarUrl) {
    avatarUrl = window.location.origin + user?.avatarUrl;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <PublicChecklistHeader
          checklist={checklist}
          totalCount={checklist.items.length}
          user={user}
          avatarUrl={avatarUrl}
        />

        <main className="space-y-6">
          <PublicChecklistBody checklist={checklist} />
        </main>

        <footer className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            {t("public.checklist_shared_by", { owner: checklist.owner || "" })}
          </p>
        </footer>
      </div>
    </div>
  );
};
