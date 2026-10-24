import { ReactNode } from "react";
import { cn } from "@/app/_utils/global-utils";
import { KICKER_CLASS } from "@/app/_consts/styling";

interface ShareSectionProps {
  id: string;
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}

export const ShareSection = ({ id, title, aside, children }: ShareSectionProps) => (
  <section
    aria-labelledby={id}
    className="jotty-share-section py-3 border-t border-dashed border-border first:border-t-0"
  >
    <div className="flex items-center justify-between gap-3 px-6 pt-1 pb-2">
      <h3 id={id} className={KICKER_CLASS}>
        {title}
      </h3>
      {aside && <span className={cn(KICKER_CLASS, "text-primary")}>{aside}</span>}
    </div>
    {children}
  </section>
);
