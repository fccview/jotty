"use client";

import React, { useState } from "react";
import { ArrowDown01Icon, ArrowRight01Icon } from "hugeicons-react";
import { cn } from "@/app/_utils/global-utils";

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  titleClassName?: string;
}

export const Accordion = ({
  title,
  children,
  defaultOpen = false,
  className = "",
  titleClassName = "",
}: AccordionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "jotty-accordion border border-border rounded-jotty bg-card",
        className
      )}
    >
      <button
        className={cn(
          "jotty-accordion-title flex items-center justify-between w-full p-6 text-lg font-semibold",
          "text-foreground hover:bg-muted/50 transition-colors",
          isOpen && "border-b border-border/70",
          titleClassName
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {title}
        {isOpen ? (
          <ArrowDown01Icon className="h-5 w-5 transition-transform duration-200" />
        ) : (
          <ArrowRight01Icon className="h-5 w-5 transition-transform duration-200" />
        )}
      </button>
      {isOpen && (
        <div className="jotty-accordion-content p-6 pt-4">{children}</div>
      )}
    </div>
  );
};
