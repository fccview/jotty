"use client";

import { HelpCircleIcon } from "hugeicons-react";
import { NavigationGlobalIcon } from "./NavigationGlobalIcon";
import { useShortcuts } from "@/app/_hooks/useShortcuts";
import { useRouter } from "next/navigation";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";

const HOWTO_SHORTCUTS_PATH = "/howto/shortcuts";

export const NavigationHelpIcon = () => {
  const router = useRouter();
  const { checkNavigation } = useNavigationGuard();

  const openHowto = () =>
    checkNavigation(() => router.push(HOWTO_SHORTCUTS_PATH));

  useShortcuts([
    {
      code: "KeyH",
      modKey: true,
      shiftKey: true,
      skipInEditable: true,
      handler: openHowto,
    },
  ]);

  return (
    <NavigationGlobalIcon
      icon={<HelpCircleIcon className="h-5 w-5" />}
      onClick={openHowto}
    />
  );
};
