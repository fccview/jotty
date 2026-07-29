"use client";

import {
  Globe02Icon,
  UserEdit01Icon,
  UserIcon,
  UserRemove01Icon,
} from "hugeicons-react";
import { useTranslations } from "next-intl";
import { SharingPermissions } from "@/app/_types/core";
import { SharePerms } from "@/app/_types/enums";
import { codeFromPerms } from "@/app/_utils/sharing-utils";
import { cn } from "@/app/_utils/global-utils";

export const SHARE_ICONS = {
  [SharePerms.READ]: UserIcon,
  [SharePerms.WRITE]: UserEdit01Icon,
  [SharePerms.DELETE]: UserRemove01Icon,
};

const BADGE_ORDER: SharePerms[] = [
  SharePerms.DELETE,
  SharePerms.WRITE,
  SharePerms.READ,
];

const BADGE_LABELS = {
  [SharePerms.READ]: "sharing.readTip",
  [SharePerms.WRITE]: "sharing.writeTip",
  [SharePerms.DELETE]: "sharing.deleteTip",
};

interface ShareBadgesProps {
  grants?: Record<string, SharingPermissions>;
  isPublic?: boolean;
  onClick?: () => void;
  className?: string;
  iconClassName?: string;
}

export const ShareBadges = ({
  grants,
  isPublic,
  onClick,
  className,
  iconClassName,
}: ShareBadgesProps) => {
  const t = useTranslations();

  const groups = new Map<SharePerms, string[]>();

  Object.entries(grants || {}).forEach(([username, perms]) => {
    const code = codeFromPerms(perms);
    groups.set(code, [...(groups.get(code) || []), username]);
  });

  if (groups.size === 0 && !isPublic) return null;

  const glyph = cn("h-4 w-4 text-muted-foreground", iconClassName);

  return (
    <span
      className={cn(
        "flex items-center gap-1 shrink-0",
        onClick && "cursor-pointer hover:text-primary",
        className,
      )}
      onClick={onClick}
    >
      {BADGE_ORDER.map((code) => {
        const users = groups.get(code);
        if (!users || users.length === 0) return null;

        const Icon = SHARE_ICONS[code];

        return (
          <span key={code} title={t(BADGE_LABELS[code], { users: users.join(", ") })}>
            <Icon className={glyph} />
          </span>
        );
      })}

      {isPublic && (
        <span title={t("sharing.publicTip")}>
          <Globe02Icon className={glyph} />
        </span>
      )}
    </span>
  );
};
