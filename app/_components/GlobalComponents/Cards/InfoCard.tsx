import { cn } from "@/app/_utils/global-utils";
import { ReactNode } from "react";

export enum InfoCardVariant {
  DEFAULT = "default",
  PRIMARY = "primary",
  WARNING = "warning",
  DESTRUCTIVE = "destructive",
}

interface InfoCardProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  variant?: InfoCardVariant;
}

export const InfoCard = ({
  icon,
  title,
  children,
  variant = InfoCardVariant.DEFAULT,
}: InfoCardProps) => {
  const variants = {
    [InfoCardVariant.DEFAULT]: {
      bg: "bg-card",
      border: "border-border",
      iconBg: "bg-primary/10",
      iconText: "text-primary",
      titleText: "text-foreground",
      bodyText: "text-muted-foreground",
    },
    [InfoCardVariant.PRIMARY]: {
      bg: "bg-primary/5",
      border: "border-primary/20",
      iconBg: "bg-primary/10",
      iconText: "text-primary",
      titleText: "text-primary",
      bodyText: "text-primary/80",
    },
    [InfoCardVariant.WARNING]: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconBg: "bg-amber-100",
      iconText: "text-amber-600",
      titleText: "font-semibold text-amber-800",
      bodyText: "text-md lg:text-sm text-amber-700",
    },
    [InfoCardVariant.DESTRUCTIVE]: {
      bg: "bg-destructive/10",
      border: "border-destructive/20",
      iconBg: "bg-destructive/10",
      iconText: "text-destructive",
      titleText: "font-medium text-destructive",
      bodyText: "text-md lg:text-xs text-destructive/80",
    },
  };

  const variantClasses = variants[variant];
  return (
    <div
      className={cn(
        "jotty-info-card rounded-md p-6 shadow-sm",
        variantClasses.bg,
        variantClasses.border
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "p-2 rounded-jotty flex-shrink-0",
            variantClasses.iconBg
          )}
        >
          {icon}
        </div>
        <div className="flex-1">
          <h3 className={cn("mb-1", variantClasses.titleText)}>{title}</h3>
          <div className={cn(variantClasses.bodyText)}>{children}</div>
        </div>
      </div>
    </div>
  );
};
