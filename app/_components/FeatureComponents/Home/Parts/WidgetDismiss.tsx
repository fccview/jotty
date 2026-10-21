"use client";

import { MultiplicationSignIcon } from "hugeicons-react";
import { HomeWidgetKey } from "@/app/_consts/home";
import { useHideWidget } from "@/app/_hooks/settings/useHideWidget";
import { cn } from "@/app/_utils/global-utils";

interface WidgetDismissProps {
  widget: HomeWidgetKey;
  onPrimary?: boolean;
  className?: string;
}

export const WidgetDismiss = ({ widget, onPrimary = false, className }: WidgetDismissProps) => {
  const { hide, isHiding, label } = useHideWidget(widget);

  return (
    <button
      type="button"
      onClick={hide}
      disabled={isHiding}
      aria-label={label}
      title={label}
      className={cn(
        "jotty-widget-dismiss inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-jotty transition-[opacity,color,background-color] duration-150",
        "opacity-0 group-hover/widget:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        onPrimary
          ? "text-primary-foreground/80 hover:bg-primary-foreground/[0.15] hover:text-primary-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        className,
      )}
    >
      <MultiplicationSignIcon className="h-4 w-4" />
    </button>
  );
};
