"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Checklist, User } from "@/app/_types";
import { PublicChecklistHeader } from "@/app/_components/FeatureComponents/PublicView/Parts/PublicChecklistHeader";
import { PublicChecklistBody } from "@/app/_components/FeatureComponents/PublicView/Parts/PublicChecklistBody";
import { PublicUser } from "@/app/_utils/user-sanitize-utils";

interface PublicChecklistViewProps {
  checklist: Checklist;
  user: PublicUser | null;
  ownerShowsEmojis: boolean;
}

export const PublicChecklistView = ({
  checklist,
  user,
  ownerShowsEmojis,
}: PublicChecklistViewProps) => {
  const t = useTranslations();
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && user?.avatarUrl) {
      setAvatarUrl(window.location.origin + user.avatarUrl);
    }
  }, [user?.avatarUrl]);

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
          <PublicChecklistBody
            checklist={checklist}
            ownerShowsEmojis={ownerShowsEmojis}
          />
        </main>

        <footer className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-md lg:text-sm text-muted-foreground">
            {t("checklists.sharedPubliclyBy", { owner: checklist.owner ?? "" })}
          </p>
        </footer>
      </div>
    </div>
  );
};
