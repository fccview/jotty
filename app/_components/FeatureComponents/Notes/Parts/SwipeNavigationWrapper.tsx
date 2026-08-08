"use client";

import { useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Note } from "@/app/_types";
import { useAdjacentNotes } from "@/app/_hooks/useAdjacentNotes";
import { useSwipeNavigation } from "@/app/_hooks/useSwipeNavigation";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { isMobileDevice, itemHref } from "@/app/_utils/global-utils";
import { ItemTypes } from "@/app/_types/enums";

interface SwipeNavigationWrapperProps {
  children: ReactNode;
  noteUuid: string;
  enabled: boolean;
}

const getNoteUrl = (note: Partial<Note> | null, embed = false): string | null => {
  if (!note?.uuid) return null;
  const base = itemHref(ItemTypes.NOTE, note.uuid);
  return embed ? `${base}?embed=true` : base;
};

export const SwipeNavigationWrapper = ({
  children,
  noteUuid,
  enabled,
}: SwipeNavigationWrapperProps) => {
  const router = useRouter();
  const { checkNavigation } = useNavigationGuard();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const { prev, next } = useAdjacentNotes(noteUuid);

  const prevUrl = getNoteUrl(prev, true);
  const nextUrl = getNoteUrl(next, true);
  const prevNavUrl = getNoteUrl(prev);
  const nextNavUrl = getNoteUrl(next);

  useEffect(() => {
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      document.documentElement.classList.add("jotty-embed");
      return;
    }

    setIsMobile(isMobileDevice());
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    if (prevNavUrl) router.prefetch(prevNavUrl);
    if (nextNavUrl) router.prefetch(nextNavUrl);
  }, [isMobile, prevNavUrl, nextNavUrl, router]);

  const navigateToNote = useCallback((note: Partial<Note> | null) => {
    const url = getNoteUrl(note);
    if (!url) return;
    checkNavigation(() => {
      router.push(url);
    });
  }, [checkNavigation, router]);

  const handleNavigateLeft = useCallback(() => {
    navigateToNote(next);
  }, [next, navigateToNote]);

  const handleNavigateRight = useCallback(() => {
    navigateToNote(prev);
  }, [prev, navigateToNote]);

  useSwipeNavigation({
    enabled: isMobile && enabled,
    onNavigateLeft: handleNavigateLeft,
    onNavigateRight: handleNavigateRight,
    wrapperRef,
    currentRef,
    prevRef,
    nextRef,
    hasPrev: !!prev,
    hasNext: !!next,
  });

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div ref={wrapperRef} className="relative w-full h-full overflow-x-hidden">
      <div
        ref={currentRef}
        className="relative z-10 w-full h-full"
      >
        {children}
      </div>

      {prevUrl && (
        <div
          ref={prevRef}
          className="absolute inset-0 z-20 bg-background pointer-events-none"
          style={{ opacity: 0, display: "none" }}
        >
          <iframe
            src={prevUrl}
            className="w-full h-full border-0 pointer-events-none"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      )}

      {nextUrl && (
        <div
          ref={nextRef}
          className="absolute inset-0 z-20 bg-background pointer-events-none"
          style={{ opacity: 0, display: "none" }}
        >
          <iframe
            src={nextUrl}
            className="w-full h-full border-0 pointer-events-none"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
};
