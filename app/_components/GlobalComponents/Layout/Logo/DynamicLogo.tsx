"use client";

import { useState } from "react";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";
import { LegacyLogo } from "@/app/_components/GlobalComponents/Layout/Logo/LegacyLogo";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useTranslations } from "next-intl";

interface DynamicLogoProps {
  className?: string;
  size?: "16x16" | "32x32" | "180x180";
}

export const DynamicLogo = ({
  className = "h-8 w-8",
  size = "32x32",
}: DynamicLogoProps) => {
  const { isRwMarkable, appSettings } = useAppMode();
  const [imageError, setImageError] = useState(false);
  const t = useTranslations();

  const iconKey =
    size === "16x16"
      ? "16x16Icon"
      : size === "32x32"
        ? "32x32Icon"
        : "180x180Icon";

  const customIcon = appSettings?.[iconKey];

  if (customIcon && !imageError) {
    return (
      <img
        src={customIcon}
        alt={t("common.appLogo")}
        className={`jotty-logo ${className} object-contain`}
        onError={() => {
          setImageError(true);
        }}
      />
    );
  }

  return isRwMarkable ? (
    <LegacyLogo className={className} />
  ) : (
    <Logo className={className} />
  );
};
