"use client";

import { useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Note } from "@/app/_types";
import { useAdjacentNotes } from "@/app/_hooks/useAdjacentNotes";
import { useSwipeNavigation } from "@/app/_hooks/useSwipeNavigation";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { isMobileDevice, buildCategoryPath } from "@/app/_utils/global-utils";

interface SwipeNavigationWrapperProps {
  children: ReactNode;
  noteId: string;
  noteCategory?: string;
  enabled: boolean;
}

const getNoteUrl = (note: Partial<Note> | null): string | null => {
  if (!note?.id) return null;
  return `/note/${buildCategoryPath(note.category || "Uncategorized", note.id)}`;
};

export const SwipeNavigationWrapper = ({
  children,
  noteId,
  noteCategory,
  enabled,
}: SwipeNavigationWrapperProps) => {
  const router = useRouter();
  const { checkNavigation } = useNavigationGuard();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [screenWidth, setScreenWidth] = useState(0);
  const { prev, next } = useAdjacentNotes(noteId);

  const prevUrl = getNoteUrl(prev);
  const nextUrl = getNoteUrl(next);

  useEffect(() => {
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      document.documentElement.classList.add("jotty-embed");
      return;
    }

    const mobile = isMobileDevice();
    setIsMobile(mobile);
    if (mobile) {
      setScreenWidth(window.innerWidth);
    }
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    if (prevUrl) router.prefetch(prevUrl);
    if (nextUrl) router.prefetch(nextUrl);
  }, [isMobile, prevUrl, nextUrl, router]);

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
    containerRef,
    hasPrev: !!prev,
    hasNext: !!next,
  });

  if (!isMobile || screenWidth === 0) {
    return <>{children}</>;
  }

  return (
    <div className="overflow-hidden w-full h-full">
      <div
        ref={containerRef}
        className="flex h-full"
        style={{
          width: `${screenWidth * 3}px`,
          transform: `translateX(-${screenWidth}px)`,
          willChange: "transform",
        }}
      >
        <div className="h-full overflow-hidden" style={{ width: `${screenWidth}px`, flexShrink: 0 }}>
          {prevUrl ? (
            <iframe
              src={prevUrl}
              className="w-full h-full border-0 pointer-events-none"
              tabIndex={-1}
              aria-hidden="true"
            />
          ) : (
            <div className="w-full h-full bg-background" />
          )}
        </div>
        <div className="h-full" style={{ width: `${screenWidth}px`, flexShrink: 0 }}>
          {children}
        </div>
        <div className="h-full overflow-hidden" style={{ width: `${screenWidth}px`, flexShrink: 0 }}>
          {nextUrl ? (
            <iframe
              src={nextUrl}
              className="w-full h-full border-0 pointer-events-none"
              tabIndex={-1}
              aria-hidden="true"
            />
          ) : (
            <div className="w-full h-full bg-background" />
          )}
        </div>
      </div>
    </div>
  );
};
