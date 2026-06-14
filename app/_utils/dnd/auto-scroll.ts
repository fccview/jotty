import { DragPoint } from "@/app/_types/dnd";
import { EDGE_SCROLL_PX, MAX_SCROLL_STEP } from "@/app/_consts/dnd";

export interface AutoScroller {
  start: (scrollers: HTMLElement[]) => void;
  update: (point: DragPoint) => void;
  stop: () => void;
}

const _axisStep = (pos: number, start: number, end: number): number => {
  if (end - start < EDGE_SCROLL_PX * 3) return 0;
  if (pos < start + EDGE_SCROLL_PX) {
    const strength = Math.min(1, (start + EDGE_SCROLL_PX - pos) / EDGE_SCROLL_PX);
    return -Math.ceil(strength * MAX_SCROLL_STEP);
  }
  if (pos > end - EDGE_SCROLL_PX) {
    const strength = Math.min(1, (pos - (end - EDGE_SCROLL_PX)) / EDGE_SCROLL_PX);
    return Math.ceil(strength * MAX_SCROLL_STEP);
  }
  return 0;
};

export const createScroller = (): AutoScroller => {
  let frame: number | null = null;
  let point: DragPoint | null = null;
  let scrollers: HTMLElement[] = [];

  const _tick = () => {
    frame = requestAnimationFrame(_tick);
    if (!point) return;

    for (const el of scrollers) {
      const rect = el.getBoundingClientRect();
      const inside =
        point.x >= rect.left &&
        point.x <= rect.right &&
        point.y >= rect.top &&
        point.y <= rect.bottom;
      if (!inside) continue;

      const dy = _axisStep(point.y, rect.top, rect.bottom);
      const dx = _axisStep(point.x, rect.left, rect.right);
      if (dy) el.scrollTop += dy;
      if (dx) el.scrollLeft += dx;
    }
  };

  return {
    start: (targets) => {
      scrollers = targets;
      point = null;
      if (frame === null) frame = requestAnimationFrame(_tick);
    },
    update: (next) => {
      point = next;
    },
    stop: () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      point = null;
      scrollers = [];
    },
  };
};
