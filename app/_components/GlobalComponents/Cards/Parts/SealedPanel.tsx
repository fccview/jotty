"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/app/_utils/global-utils";
import { WizardIcon } from "@/app/_components/GlobalComponents/Layout/CustomIcons/WizardIcon";

export enum SealedSize {
  XS = "xs",
  SM = "sm",
  LG = "lg",
}

const STRIPES =
  "bg-[repeating-linear-gradient(135deg,rgb(var(--primary)/0.08)_0_6px,transparent_6px_12px)]";

export const SealedPanel = ({ size = SealedSize.SM }: { size?: SealedSize }) => {
  const t = useTranslations();

  if (size === SealedSize.LG) {
    return (
      <div
        className={cn(
          "jotty-sealed-panel rounded-jotty border border-dashed border-primary/30 px-6 py-12 text-center",
          STRIPES,
        )}
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-jotty bg-primary text-primary-foreground mb-4">
          <WizardIcon className="h-7 w-7" />
        </span>
        <p className="font-semibold text-foreground">
          {t("encryption.thisNoteIsEncrypted")}
        </p>
        <p className="text-md lg:text-sm text-muted-foreground mt-1">
          {t("browse.shallNotPass")}
        </p>
      </div>
    );
  }

  const isXs = size === SealedSize.XS;

  return (
    <div
      className={cn(
        "jotty-sealed-panel rounded-jotty border border-dashed border-primary/30 flex items-center gap-3",
        STRIPES,
        isXs ? "px-2.5 py-2.5" : "px-3 py-3",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-jotty bg-primary/[0.15] text-primary shrink-0",
          isXs ? "h-7 w-7" : "h-9 w-9",
        )}
      >
        <WizardIcon className={isXs ? "h-5 w-5" : "h-6 w-6"} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight">
          {t("encryption.thisNoteIsEncrypted")}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("browse.shallNotPass")}
        </p>
      </div>
    </div>
  );
};
