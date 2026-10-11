"use client";

import { RefObject, useCallback, useLayoutEffect, useRef } from "react";
import {
  ReadingAnchor,
  captureAnchor,
  findScroller,
  restoreAnchor,
  surfaceOf,
} from "@/app/_utils/reading-anchor-utils";

const RESTORE_WINDOW_MS = 1500;
const SETTLE_WINDOW_MS = 8000;
const HEADING_GRACE_MS = 300;
const USER_INTENT_EVENTS = ["wheel", "touchstart", "keydown", "mousedown"];
const LISTEN = { capture: true, passive: true } as const;

export const useReadingAnchor = (
  rootRef: RefObject<HTMLElement | null>,
  layoutKey: string
) => {
  const anchorRef = useRef<ReadingAnchor | null>(null);
  const heldRef = useRef(false);

  const capture = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const surface = surfaceOf(root);
    const scroller = findScroller(surface);
    if (scroller) anchorRef.current = captureAnchor(surface, scroller);
  }, [rootRef]);

  const hold = useCallback(() => {
    if (!heldRef.current) capture();
    heldRef.current = true;
  }, [capture]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const anchor = anchorRef.current;
    heldRef.current = false;

    const started = performance.now();
    let frame = 0;
    let trackFrame = 0;
    let restoring = Boolean(anchor);
    let watched: HTMLElement | null = null;

    const elapsed = () => performance.now() - started;

    const correct = () => {
      if (!restoring || !anchor) return;
      restoreAnchor(root, anchor, elapsed() > HEADING_GRACE_MS);
    };

    const settle = new ResizeObserver(() => {
      if (elapsed() > SETTLE_WINDOW_MS) stop();
      else correct();
    });

    const watchSurface = () => {
      const surface = surfaceOf(root);
      if (surface === watched) return;
      if (watched) settle.unobserve(watched);
      settle.observe(surface);
      watched = surface;
    };

    const stop = () => {
      restoring = false;
      cancelAnimationFrame(frame);
      settle.disconnect();
    };

    const tick = () => {
      if (!restoring) return;
      watchSurface();
      correct();
      if (elapsed() < RESTORE_WINDOW_MS) frame = requestAnimationFrame(tick);
    };

    const track = () => {
      if (restoring || heldRef.current) return;
      cancelAnimationFrame(trackFrame);
      trackFrame = requestAnimationFrame(capture);
    };

    const settleTimer = setTimeout(stop, SETTLE_WINDOW_MS);
    USER_INTENT_EVENTS.forEach((type) => window.addEventListener(type, stop, LISTEN));
    document.addEventListener("scroll", track, LISTEN);
    if (restoring) tick();

    return () => {
      stop();
      clearTimeout(settleTimer);
      cancelAnimationFrame(trackFrame);
      USER_INTENT_EVENTS.forEach((type) => window.removeEventListener(type, stop, LISTEN));
      document.removeEventListener("scroll", track, LISTEN);
    };
  }, [layoutKey, rootRef, capture]);

  return hold;
};
