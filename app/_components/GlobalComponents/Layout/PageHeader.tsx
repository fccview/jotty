"use client";

import { ArrowLeft01Icon, Add01Icon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useRouter } from "next/navigation";

interface PageHeaderProps {
  title: string;
  description: string;
  showBackButton?: boolean;
  backButtonText?: string;
  actionButton?: {
    text: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  stats?: {
    current: number;
    total: number;
  };
  className?: string;
}

export const PageHeader = ({
  title,
  description,
  showBackButton = true,
  backButtonText = "Back",
  actionButton,
  stats,
  className = "",
}: PageHeaderProps) => {
  const router = useRouter();

  return (
    <div className={`jotty-page-header mb-8 ${className}`}>
      {showBackButton && (
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft01Icon className="h-4 w-4 mr-2" />
          {backButtonText}
        </Button>
      )}

      <div className="jotty-page-header-content flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="jotty-page-header-title text-3xl font-bold text-foreground">
            {title}
          </h1>
          <p className="jotty-page-header-description text-muted-foreground">
            {stats
              ? `Showing ${stats.current}-${stats.total} of ${stats.total
              } ${description.toLowerCase()}`
              : description}
          </p>
        </div>

        {actionButton && (
          <Button onClick={actionButton.onClick} size="sm">
            {actionButton.icon && (
              <span className="mr-2">{actionButton.icon}</span>
            )}
            {actionButton.text}
          </Button>
        )}
      </div>
    </div>
  );
};
