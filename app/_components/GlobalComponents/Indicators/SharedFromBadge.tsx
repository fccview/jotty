"use client";

import { useTranslations } from "next-intl";
import { SharingPermissions } from "@/app/_types/core";
import { SharePerms } from "@/app/_types/enums";
import { codeFromPerms } from "@/app/_utils/sharing-utils";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { cn } from "@/app/_utils/global-utils";
import { SHARE_ICONS } from "./ShareBadges";

const FROM_LABELS = {
  [SharePerms.READ]: "sharing.fromUserRead",
  [SharePerms.WRITE]: "sharing.fromUserWrite",
  [SharePerms.DELETE]: "sharing.fromUserDelete",
};

const READ_ONLY: SharingPermissions = {
  canRead: true,
  canEdit: false,
  canDelete: false,
};

interface SharedFromBadgeProps {
  owner?: string;
  permissions?: SharingPermissions;
  showAvatar?: boolean;
  className?: string;
  iconClassName?: string;
}

export const SharedFromBadge = ({
  owner,
  permissions,
  showAvatar,
  className,
  iconClassName,
}: SharedFromBadgeProps) => {
  const t = useTranslations();
  const { usersPublicData } = useAppMode();

  if (!owner) return null;

  const code = codeFromPerms(permissions || READ_ONLY);
  const Icon = SHARE_ICONS[code];
  const known = (usersPublicData || []).find(
    (entry) => entry.username === owner,
  );

  return (
    <span
      className={cn("flex items-center gap-1 shrink-0 text-primary", className)}
      title={t(FROM_LABELS[code], { user: owner })}
    >
      {showAvatar && (
        <UserAvatar
          username={owner}
          avatarUrl={known ? known.avatarUrl || "" : undefined}
          size="xs"
        />
      )}
      <Icon className={cn("h-4 w-4 text-primary", iconClassName)} />
    </span>
  );
};
