"use client";

import { HelpCircleIcon } from "hugeicons-react";
import { NavigationGlobalIcon } from "./NavigationGlobalIcon";
import { useShortcuts } from "@/app/_hooks/useShortcuts";
import { useRouter } from "next/navigation";

export const NavigationHelpIcon = () => {
  const router = useRouter();

  useShortcuts([
    {
      code: "KeyH",
      modKey: true,
      shiftKey: true,
      handler: () => router.push("/howto/shortcuts"),
    },
  ]);

  const handleHelpClick = () => {
    router.push("/howto/shortcuts");
  };

  return (
    <NavigationGlobalIcon
      icon={<HelpCircleIcon className="h-5 w-5" />}
      onClick={handleHelpClick}
    />
  );
};
