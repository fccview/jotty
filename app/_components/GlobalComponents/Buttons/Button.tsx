import * as React from "react";
import { cn } from "@/app/_utils/global-utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "jotty-button inline-flex items-center justify-center whitespace-nowrap rounded-jotty text-md lg:text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "jotty-button-default bg-primary text-primary-foreground hover:bg-primary/90":
              variant === "default",
            "jotty-button-destructive text-destructive hover:text-destructive-foreground hover:bg-destructive":
              variant === "destructive",
            "jotty-button-outline border border-input bg-background hover:bg-accent hover:text-accent-foreground":
              variant === "outline",
            "jotty-button-secondary bg-secondary text-secondary-foreground hover:bg-secondary/80":
              variant === "secondary",
            "jotty-button-ghost hover:bg-accent hover:text-accent-foreground":
              variant === "ghost",
            "jotty-button-link text-primary underline-offset-4 hover:underline":
              variant === "link",
          },
          {
            "h-14 lg:h-10 px-4 py-2": size === "default",
            "h-8 rounded-jotty px-2 text-xs": size === "xs",
            "h-9 rounded-jotty px-3": size === "sm",
            "h-11 rounded-jotty px-8": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
