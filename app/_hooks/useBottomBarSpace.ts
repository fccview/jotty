import { RefObject, useEffect } from "react";
import { BottomBarSpaces } from "@/app/_types/enums";

interface BottomBarSpaceOptions {
  enabled?: boolean;
  offset?: string;
}

const isPinnedBar = (bar: HTMLElement) =>
  bar.offsetHeight > 0 && getComputedStyle(bar).position === "fixed";

export const useBottomBarSpace = (
  barRef: RefObject<HTMLElement | null>,
  space: BottomBarSpaces,
  { enabled = true, offset = "0px" }: BottomBarSpaceOptions = {},
) => {
  useEffect(() => {
    const bar = barRef.current;
    const root = document.documentElement;
    if (!enabled || !bar) return;

    let reserved = 0;

    const measure = () => {
      if (!isPinnedBar(bar) || bar.offsetHeight <= reserved) return;
      reserved = bar.offsetHeight;
      root.style.setProperty(space, `calc(${reserved}px + ${offset})`);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      root.style.removeProperty(space);
    };
  }, [barRef, space, enabled, offset]);
};
