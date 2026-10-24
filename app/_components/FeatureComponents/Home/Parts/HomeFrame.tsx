import { ReactNode } from "react";
import { cn } from "@/app/_utils/global-utils";

interface HomeFrameProps {
  className?: string;
  isBare?: boolean;
  children: ReactNode;
}

export const HomeFrame = ({ className, isBare = false, children }: HomeFrameProps) => (
  <div
    className={cn(
      "h-full overflow-y-auto bg-background jotty-scrollable-content jotty-quick-nav-gutter",
      className,
    )}
  >
    {isBare ? (
      children
    ) : (
      <div className="max-w-full pt-6 pb-4 px-4 lg:pt-8 lg:pb-12 lg:px-8">{children}</div>
    )}
  </div>
);
