"use client";

import { PinIcon, PinOffIcon } from "hugeicons-react";
import { useTranslations } from "next-intl";
import { cn } from "@/app/_utils/global-utils";

interface PinToggleProps {
  isPinned: boolean;
  onToggle: () => void;
  className?: string;
}

export const PinToggle = ({ isPinned, onToggle, className }: PinToggleProps) => {
  const t = useTranslations();
  const label = isPinned ? t("common.unpin") : t("common.pin");

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        "jotty-pin-toggle group-hover:opacity-100 transition-opacity p-1.5 hover:bg-muted rounded-jotty flex-shrink-0",
        isPinned ? "opacity-100" : "opacity-100 lg:opacity-0",
        className,
      )}
      aria-label={label}
      title={label}
    >
      {isPinned ? (
        <PinOffIcon className="h-4 w-4 text-muted-foreground hover:text-primary" />
      ) : (
        <PinIcon className="h-4 w-4 text-muted-foreground hover:text-primary" />
      )}
    </button>
  );
};
