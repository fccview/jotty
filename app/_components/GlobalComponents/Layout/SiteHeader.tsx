"use client";

import { ArrowLeft01Icon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { DynamicLogo } from "@/app/_components/GlobalComponents/Layout/Logo/DynamicLogo";
import { AppName } from "@/app/_components/GlobalComponents/Layout/AppName";
import { useRouter } from "next/navigation";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import Link from "next/link";

interface SiteHeaderProps {
  title: string;
  description?: string;
  showBackButton?: boolean;
}

export const SiteHeader = ({
  title,
  description,
  showBackButton = true,
}: SiteHeaderProps) => {
  const router = useRouter();
  const { isRwMarkable } = useAppMode();

  return (
    <div className="jotty-site-header space-y-6">
      <div className="jotty-site-header-container flex items-center justify-between fixed top-0 left-0 right-0 z-50 p-4 w-full bg-background max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft01Icon className="h-4 w-4" />
            </Button>
          )}

          <Link
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <DynamicLogo className="h-8 w-8" size="32x32" />
            <AppName
              className="text-xl font-bold text-foreground"
              fallback={isRwMarkable ? "rwMarkable" : "jotty·page"}
            />
          </Link>
        </div>
      </div>

      <div className="jotty-site-header-content !mt-14 !mb-4">
        <h1 className="jotty-site-header-title text-3xl font-bold">{title}</h1>
        {description && (
          <p className="jotty-site-header-description text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};
