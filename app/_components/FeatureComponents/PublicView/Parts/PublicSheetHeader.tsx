"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { SidebarRightIcon } from "@hugeicons/core-free-icons";
import { PublicUser } from "@/app/_utils/user-sanitize-utils";
import { usePreferredDateTime } from "@/app/_hooks/usePreferredDateTime";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";

interface PublicSheetHeaderProps {
  user: PublicUser | null;
  category?: string;
  updatedAt: string;
  onOpenDetails?: () => void;
}

export const PublicSheetHeader = ({ user, category, updatedAt, onOpenDetails }: PublicSheetHeaderProps) => {
  const t = useTranslations();
  const { formatDateString } = usePreferredDateTime();
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (user?.avatarUrl) setAvatarUrl(window.location.origin + user.avatarUrl);
  }, [user?.avatarUrl]);

  return (
    <header className="no-print flex items-center gap-3 border-b border-dashed border-border px-5 py-4 lg:px-6">
      <UserAvatar size="md" username={user?.username || ""} avatarUrl={avatarUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{user?.username}</p>
        <p className="flex flex-wrap gap-x-3 text-md text-muted-foreground lg:text-xs">
          {category && <span className="truncate">{category}</span>}
          <span>{t("notes.updatedOn", { date: formatDateString(updatedAt) })}</span>
        </p>
      </div>
      {onOpenDetails && (
        <button
          type="button"
          onClick={onOpenDetails}
          title={t("notePanel.show")}
          aria-label={t("notePanel.show")}
          className="flex-none rounded-[calc(var(--jotty-radius-effective)*0.75)] p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <HugeiconsIcon icon={SidebarRightIcon} className="h-5 w-5" />
        </button>
      )}
    </header>
  );
};
