"use client";

import { Checklist, Note } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { useItemSharing } from "@/app/_hooks/useItemSharing";
import { ShareBadges } from "@/app/_components/GlobalComponents/Indicators/ShareBadges";
import { SharedFromBadge } from "@/app/_components/GlobalComponents/Indicators/SharedFromBadge";

interface ItemShareMarkProps {
  item: Pick<Note | Checklist, "uuid" | "sharedFrom" | "permissions">;
  mode: Modes.NOTES | Modes.CHECKLISTS;
  iconClassName?: string;
}

export const ItemShareMark = ({
  item,
  mode,
  iconClassName = "h-3.5 w-3.5",
}: ItemShareMarkProps) => {
  const { grants, isPublic } = useItemSharing(item.uuid, mode);

  if (item.sharedFrom) {
    return (
      <SharedFromBadge
        owner={item.sharedFrom}
        permissions={item.permissions}
        iconClassName={iconClassName}
      />
    );
  }

  return (
    <ShareBadges
      grants={grants}
      isPublic={isPublic}
      iconClassName={iconClassName}
    />
  );
};
