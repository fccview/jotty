"use client";

import { cn } from "@/app/_utils/global-utils";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

const SCROLLABLE_OVERFLOW = ["auto", "scroll"];

const findScroller = (element: HTMLElement | null): HTMLElement | null => {
  let parent = element?.parentElement ?? null;
  while (parent) {
    if (SCROLLABLE_OVERFLOW.includes(getComputedStyle(parent).overflowY)) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
};

const readProgress = (scroller: HTMLElement | null) => {
  const top = scroller ? scroller.scrollTop : window.scrollY;
  const height = scroller
    ? scroller.scrollHeight - scroller.clientHeight
    : document.documentElement.scrollHeight - window.innerHeight;
  return height > 0 ? Math.min(top / height, 1) : 0;
};

export const ReadingProgressBar = ({ fixed = false }: { fixed?: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const t = useTranslations();

  useEffect(() => {
    const scroller = fixed ? null : findScroller(containerRef.current);
    if (!fixed && !scroller) return;

    const target: HTMLElement | Window = scroller ?? window;
    let frame = 0;

    const paint = () => {
      frame = 0;
      const progress = readProgress(scroller);
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${progress})`;
      trackRef.current?.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    paint();
    target.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      target.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [fixed]);

  return (
    <div
      ref={containerRef}
      className={cn(
        fixed ? "fixed bottom-1.5 left-0 right-0" : "sticky top-0 z-10 h-0",
      )}
    >
      <div
        ref={trackRef}
        className={cn(
          "absolute top-0 left-0 right-0 bg-muted mb-6 z-10 overflow-hidden",
          fixed ? "h-[10px]" : "h-[2px]",
        )}
        role="progressbar"
        aria-valuenow={0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("common.readingProgress")}
      >
        <div
          ref={fillRef}
          className="h-full w-full origin-left bg-primary will-change-transform"
          style={{ transform: "scaleX(0)" }}
        />
      </div>
    </div>
  );
};
