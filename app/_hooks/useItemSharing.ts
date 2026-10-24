"use client";

import { useMemo } from "react";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { shareGrants, sharingInfo } from "@/app/_utils/sharing-utils";
import { Modes } from "@/app/_types/enums";

export const useItemSharing = (
  uuid: string | undefined,
  mode: Modes.NOTES | Modes.CHECKLISTS,
) => {
  const { globalSharing } = useAppMode();

  return useMemo(() => {
    const grants = shareGrants(globalSharing, uuid || "", mode);
    return {
      grants,
      people: Object.keys(grants),
      isPublic: sharingInfo(globalSharing, uuid || "").isPublic,
    };
  }, [globalSharing, uuid, mode]);
};
