"use client";

import { cn } from "@/app/_utils/global-utils";
import { useEffect, useState, useRef } from "react";

export const ReadingProgressBar = ({ fixed = false }: { fixed?: boolean }) => {
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculateProgress = () => {
      if (fixed) {
        const scrollTop = window.scrollY;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollableHeight = documentHeight - windowHeight;

        const scrollProgress =
          scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 0;

        setProgress(Math.min(scrollProgress, 100));
      } else {
        const findScrollableParent = (
          element: HTMLElement | null
        ): HTMLElement | null => {
          if (!element) return null;

          const parent = element.parentElement;
          if (!parent) return null;

          const overflowY = window.getComputedStyle(parent).overflowY;
          if (overflowY === "auto" || overflowY === "scroll") {
            return parent;
          }

          return findScrollableParent(parent);
        };

        const scrollableContainer = findScrollableParent(containerRef.current);

        if (scrollableContainer) {
          const scrollTop = scrollableContainer.scrollTop;
          const scrollHeight = scrollableContainer.scrollHeight;
          const clientHeight = scrollableContainer.clientHeight;
          const scrollableHeight = scrollHeight - clientHeight;

          const scrollProgress =
            scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 0;

          setProgress(Math.min(scrollProgress, 100));
        }
      }
    };

    calculateProgress();

    if (fixed) {
      window.addEventListener("scroll", calculateProgress);
      window.addEventListener("resize", calculateProgress);

      return () => {
        window.removeEventListener("scroll", calculateProgress);
        window.removeEventListener("resize", calculateProgress);
      };
    } else {
      const findScrollableParent = (
        element: HTMLElement | null
      ): HTMLElement | null => {
        if (!element) return null;

        const parent = element.parentElement;
        if (!parent) return null;

        const overflowY = window.getComputedStyle(parent).overflowY;
        if (overflowY === "auto" || overflowY === "scroll") {
          return parent;
        }

        return findScrollableParent(parent);
      };

      const scrollableContainer = findScrollableParent(containerRef.current);

      if (scrollableContainer) {
        scrollableContainer.addEventListener("scroll", calculateProgress);
        window.addEventListener("resize", calculateProgress);

        return () => {
          scrollableContainer.removeEventListener("scroll", calculateProgress);
          window.removeEventListener("resize", calculateProgress);
        };
      }
    }
  }, [fixed]);

  return (
    <div
      ref={containerRef}
      className={cn(fixed ? "fixed bottom-1.5 left-0 right-0" : "")}
    >
      <div
        className={cn(
          "absolute top-0 left-0 right-0 bg-muted mb-6 z-10",
          fixed ? "h-[10px]" : "h-[2px]"
        )}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reading progress"
      >
        <div
          className="h-full bg-primary transition-all duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
