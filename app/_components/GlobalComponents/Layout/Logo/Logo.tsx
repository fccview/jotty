"use client";

import { cn } from "@/app/_utils/global-utils";

export const Logo = ({ className = "h-8 w-8" }: { className?: string }) => {
  return (
    <div className={cn("bg-primary rounded-md p-0.5", className)}>
      <svg
        version="1.2"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 884 884"
        className="w-full h-full"
      >
        <path
          id="J"
          className="fill-alternate"
          d="m601.62 120.7v417.41q0 94.1-66.78 160.89-66.79 66.78-160.89 66.78l-37.95-151.78h37.95q31.11 0 53.12-22.01 22.77-22.77 22.77-53.88v-265.62h-166.96v-151.79z"
        />
      </svg>
    </div>
  );
};
