"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AiBrain04Icon } from "hugeicons-react";
import { brainHref } from "@/app/_consts/relations";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { cn } from "@/app/_utils/global-utils";

interface BrainButtonProps {
  uuid?: string;
  className?: string;
}

export const BrainButton = ({ uuid, className }: BrainButtonProps) => {
  const t = useTranslations();
  const { appSettings } = useAppMode();

  if (!uuid || appSettings?.editor?.enableBilateralLinks === false) return null;

  return (
    <Link
      href={brainHref(uuid)}
      aria-label={t("brain.openBrain")}
      title={t("brain.openBrain")}
      className={cn(
        "jotty-button jotty-button-outline inline-flex items-center justify-center rounded-jotty border border-input bg-background text-primary transition-colors hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      <AiBrain04Icon className="h-5 w-5" />
    </Link>
  );
};
