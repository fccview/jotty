"use client";

import { ReactNode } from "react";
import { ArrowDown01Icon } from "hugeicons-react";
import { cn } from "@/app/_utils/global-utils";

export const SENTENCE_FONT = "font-['IBM_Plex_Sans_Variable',sans-serif]";

interface SentenceWordProps {
  isOpen: boolean;
  isSet: boolean;
  onClick: () => void;
  children: ReactNode;
}

export const SentenceWord = ({ isOpen, isSet, onClick, children }: SentenceWordProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-expanded={isOpen}
    className={cn(
      "jotty-sentence-word inline-flex items-baseline gap-[0.15rem] p-0 font-semibold leading-tight border-b-2 cursor-pointer transition-colors hover:text-primary hover:border-primary",
      SENTENCE_FONT,
      isSet || isOpen
        ? "text-primary border-primary"
        : "text-foreground border-dashed border-primary/[0.45]",
      isSet && "border-solid",
    )}
  >
    <span className={cn("truncate max-w-[60vw] sm:max-w-[22rem]", SENTENCE_FONT)}>
      {children}
    </span>
    <ArrowDown01Icon className="h-4 w-4 shrink-0 self-center -mr-[0.2rem]" />
  </button>
);
