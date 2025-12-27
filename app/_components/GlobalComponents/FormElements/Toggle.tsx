"use client";

import { cn } from "@/app/_utils/global-utils";

interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  id?: string;
}

export const Toggle = ({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  size = "md",
  id,
}: ToggleProps) => {
  const sizeClasses = {
    sm: "h-4 w-7",
    md: "h-5 w-9",
    lg: "h-6 w-11",
  };

  const thumbSizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const translateClasses = {
    sm: checked ? "translate-x-3" : "translate-x-0",
    md: checked ? "translate-x-4" : "translate-x-0",
    lg: checked ? "translate-x-5" : "translate-x-0",
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      id={id}
      className={cn(
        "jotty-toggle relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-none focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "jotty-toggle-checked bg-primary"
          : "jotty-toggle-unchecked bg-input",
        sizeClasses[size],
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out",
          thumbSizeClasses[size],
          translateClasses[size]
        )}
      />
    </button>
  );
};
