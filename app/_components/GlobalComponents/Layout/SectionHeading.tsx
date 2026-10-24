import { ReactNode } from "react";

interface SectionHeadingProps {
  title: ReactNode;
  children?: ReactNode;
}

export const SectionHeading = ({ title, children }: SectionHeadingProps) => (
  <div className="jotty-section-heading flex items-center gap-3 mb-4 sm:mb-6">
    <h2 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h2>
    <div className="flex-1 h-px bg-border" />
    {children}
  </div>
);
