"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";
import { getSettings } from "@/app/_server/actions/config";
import { LegacyLogo } from "@/app/_components/GlobalComponents/Layout/Logo/LegacyLogo";
import { useAppMode } from "@/app/_providers/AppModeProvider";

interface DynamicLogoProps {
  className?: string;
  size?: "16x16" | "32x32" | "180x180";
}

export const DynamicLogo = ({
  className = "h-8 w-8",
  size = "32x32",
}: DynamicLogoProps) => {
  const [customIcon, setCustomIcon] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { isRwMarkable } = useAppMode();

  useEffect(() => {
    const loadCustomIcon = async () => {
      try {
        const settings = await getSettings();
        const iconKey =
          size === "16x16"
            ? "16x16Icon"
            : size === "32x32"
              ? "32x32Icon"
              : "180x180Icon";
        const iconUrl = settings[iconKey];

        if (iconUrl) {
          setCustomIcon(iconUrl);
        }
      } catch (error) {
        console.error("Error loading custom icon:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCustomIcon();
  }, [size]);

  if (loading) {
    return <div className={`${className} bg-muted animate-pulse rounded`} />;
  }

  if (customIcon) {
    return (
      <img
        src={customIcon}
        alt="App Logo"
        className={`${className} object-contain`}
        onError={() => {
          setCustomIcon(null);
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
