"use client";

import { cn } from "@/app/_utils/global-utils";

interface SidebarItemProps {
  icon: any;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export const SidebarItem = ({
  icon: Icon,
  label,
  isActive,
  onClick,
}: SidebarItemProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 text-md lg:text-sm rounded-jotty transition-colors",
        isActive
          ? "bg-primary text-primary-foreground font-medium"
          : "text-foreground hover:bg-accent"
      )}
    >
      <Icon className="h-5 w-5 lg:h-4 lg:w-4 flex-shrink-0" />
      <span className="truncate text-left">{label}</span>
    </button>
  );
};
