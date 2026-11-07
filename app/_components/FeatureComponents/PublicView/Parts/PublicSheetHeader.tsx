"use client";

import { ReactNode, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { SidebarRightIcon } from "@hugeicons/core-free-icons";
import { PublicUser } from "@/app/_utils/user-sanitize-utils";
import { usePreferredDateTime } from "@/app/_hooks/usePreferredDateTime";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { cn } from "@/app/_utils/global-utils";

interface PublicSheetHeaderProps {
  user: PublicUser | null;
  category?: string;
  updatedAt: string;
  actions?: ReactNode;
  isDetailsOpen?: boolean;
  onToggleDetails?: () => void;
}

export const PublicSheetHeader = ({
  user,
  category,
  updatedAt,
  actions,
  isDetailsOpen = false,
  onToggleDetails,
}: PublicSheetHeaderProps) => {
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
      {actions}
      {onToggleDetails && (
        <button
          type="button"
          onClick={onToggleDetails}
          title={t(isDetailsOpen ? "notePanel.hide" : "notePanel.show")}
          aria-label={t(isDetailsOpen ? "notePanel.hide" : "notePanel.show")}
          aria-pressed={isDetailsOpen}
          className={cn(
            "flex-none rounded-[calc(var(--jotty-radius-effective)*0.75)] p-2 transition-colors hover:bg-muted hover:text-foreground",
            isDetailsOpen ? "text-primary" : "text-muted-foreground",
          )}
        >
          <HugeiconsIcon icon={SidebarRightIcon} className="h-5 w-5" />
        </button>
      )}
    </header>
  );
};
