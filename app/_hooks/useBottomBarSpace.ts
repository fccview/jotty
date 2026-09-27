import { RefObject, useEffect, useRef } from "react";
import { BottomBarSpaces } from "@/app/_types/enums";

interface BottomBarSpaceOptions {
  enabled?: boolean;
  frozen?: boolean;
}

const occupiedSpace = (bar: HTMLElement) => {
  if (!bar.offsetHeight) return 0;
  if (getComputedStyle(bar).position !== "fixed") return 0;
  return Math.max(0, window.innerHeight - bar.getBoundingClientRect().top);
};

export const useBottomBarSpace = (
  barRef: RefObject<HTMLElement | null>,
  space: BottomBarSpaces,
  { enabled = true, frozen = false }: BottomBarSpaceOptions = {},
) => {
  const frozenRef = useRef(frozen);

  useEffect(() => {
    frozenRef.current = frozen;
  }, [frozen]);

  useEffect(() => {
    const bar = barRef.current;
    const root = document.documentElement;
    if (!enabled || !bar) return;

    const measure = () => {
      if (frozenRef.current) return;
      root.style.setProperty(space, `${Math.ceil(occupiedSpace(bar))}px`);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    bar.addEventListener("transitionend", measure);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      bar.removeEventListener("transitionend", measure);
      window.removeEventListener("resize", measure);
      root.style.removeProperty(space);
    };
  }, [barRef, space, enabled]);
};
