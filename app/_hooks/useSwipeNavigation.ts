"use client";

import { useEffect, useRef, useCallback, RefObject } from "react";

interface UseSwipeNavigationProps {
  enabled: boolean;
  onNavigateLeft: () => void;
  onNavigateRight: () => void;
  wrapperRef: RefObject<HTMLDivElement | null>;
  currentRef: RefObject<HTMLDivElement | null>;
  prevRef: RefObject<HTMLDivElement | null>;
  nextRef: RefObject<HTMLDivElement | null>;
  hasPrev: boolean;
  hasNext: boolean;
}

const COMPLETION_THRESHOLD = 0.3;
const VELOCITY_THRESHOLD = 0.35;
const DIRECTION_LOCK_DISTANCE = 10;
const RESISTANCE_FACTOR = 0.25;
const SNAP_DURATION = 350;
const COMPLETE_DURATION = 280;
const SNAP_EASING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const COMPLETE_EASING = "cubic-bezier(0.22, 0.68, 0.31, 1)";

const CURRENT_PARALLAX = 0.35;
const CURRENT_FADE_TO = 0.25;
const CURRENT_SHRINK_TO = 0.92;
const INCOMING_START_SCALE = 0.88;

const ALL_TRANSITION = `transform ${SNAP_DURATION}ms ${SNAP_EASING}, opacity ${SNAP_DURATION}ms ease-out`;
const COMPLETE_TRANSITION = `transform ${COMPLETE_DURATION}ms ${COMPLETE_EASING}, opacity ${COMPLETE_DURATION}ms ${COMPLETE_EASING}`;

const applyStyles = (
  el: HTMLElement | null,
  transform: string,
  opacity: number,
  transition: string | null,
) => {
  if (!el) return;
  el.style.transition = transition || "none";
  el.style.transform = transform;
  el.style.opacity = String(opacity);
};

export const useSwipeNavigation = ({
  enabled,
  onNavigateLeft,
  onNavigateRight,
  wrapperRef,
  currentRef,
  prevRef,
  nextRef,
  hasPrev,
  hasNext,
}: UseSwipeNavigationProps) => {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const directionLockedRef = useRef<"horizontal" | "vertical" | null>(null);
  const navigatingRef = useRef(false);
  const swipingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const enabledRef = useRef(enabled);
  const hasPrevRef = useRef(hasPrev);
  const hasNextRef = useRef(hasNext);
  const onNavigateLeftRef = useRef(onNavigateLeft);
  const onNavigateRightRef = useRef(onNavigateRight);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { hasPrevRef.current = hasPrev; }, [hasPrev]);
  useEffect(() => { hasNextRef.current = hasNext; }, [hasNext]);
  useEffect(() => { onNavigateLeftRef.current = onNavigateLeft; }, [onNavigateLeft]);
  useEffect(() => { onNavigateRightRef.current = onNavigateRight; }, [onNavigateRight]);

  const resetAll = useCallback((transition: string | null) => {
    const sw = window.innerWidth;
    applyStyles(currentRef.current, "translateX(0)", 1, transition);
    applyStyles(prevRef.current, `translateX(-${sw}px) scale(${INCOMING_START_SCALE})`, 0, transition);
    applyStyles(nextRef.current, `translateX(${sw}px) scale(${INCOMING_START_SCALE})`, 0, transition);
    swipingRef.current = false;
  }, [currentRef, prevRef, nextRef]);

  const applyProgress = useCallback((
    progress: number,
    direction: "left" | "right",
    transition: string | null,
  ) => {
    const p = Math.min(Math.max(progress, 0), 1);
    const sw = window.innerWidth;

    const currentShift = direction === "left"
      ? -p * CURRENT_PARALLAX * sw
      : p * CURRENT_PARALLAX * sw;
    const currentOpacity = 1 - p * (1 - CURRENT_FADE_TO);
    const currentScale = 1 - p * (1 - CURRENT_SHRINK_TO);
    applyStyles(currentRef.current, `translateX(${currentShift}px) scale(${currentScale})`, currentOpacity, transition);

    const incomingRef = direction === "left" ? nextRef : prevRef;
    const incomingX = direction === "left"
      ? (1 - p) * sw
      : -(1 - p) * sw;
    const incomingScale = INCOMING_START_SCALE + p * (1 - INCOMING_START_SCALE);
    applyStyles(incomingRef.current, `translateX(${incomingX}px) scale(${incomingScale})`, 1, transition);
  }, [currentRef, prevRef, nextRef]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabledRef.current || navigatingRef.current || window.innerWidth >= 1024) return;
    if (e.touches.length !== 1) return;

    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    directionLockedRef.current = null;
    swipingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current || !enabledRef.current || navigatingRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (!directionLockedRef.current) {
      const totalMovement = Math.abs(deltaX) + Math.abs(deltaY);
      if (totalMovement < DIRECTION_LOCK_DISTANCE) return;

      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        directionLockedRef.current = "vertical";
        touchStartRef.current = null;
        return;
      }
      directionLockedRef.current = "horizontal";
      swipingRef.current = true;
    }

    if (directionLockedRef.current !== "horizontal") return;

    const sw = window.innerWidth;
    const swipingLeft = deltaX < 0;
    const hasTarget = swipingLeft ? hasNextRef.current : hasPrevRef.current;

    let effectiveDelta = Math.abs(deltaX);
    if (!hasTarget) effectiveDelta *= RESISTANCE_FACTOR;

    const progress = Math.min(effectiveDelta / sw, 1);
    const direction: "left" | "right" = swipingLeft ? "left" : "right";

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!hasTarget) {
        const resistedShift = swipingLeft ? -effectiveDelta * 0.5 : effectiveDelta * 0.5;
        applyStyles(currentRef.current, `translateX(${resistedShift}px)`, 1, null);
      } else {
        applyProgress(progress, direction, null);
      }
    });
  }, [applyProgress, currentRef]);

  const finishTouch = useCallback((deltaX: number, deltaTime: number) => {
    const velocity = Math.abs(deltaX) / deltaTime;
    const sw = window.innerWidth;
    const progress = Math.abs(deltaX) / sw;
    const swipingLeft = deltaX < 0;
    const direction: "left" | "right" = swipingLeft ? "left" : "right";
    const hasTarget = swipingLeft ? hasNextRef.current : hasPrevRef.current;
    const meetsThreshold = hasTarget && (progress > COMPLETION_THRESHOLD || velocity > VELOCITY_THRESHOLD);

    if (meetsThreshold) {
      navigatingRef.current = true;
      applyProgress(1, direction, COMPLETE_TRANSITION);

      setTimeout(() => {
        if (direction === "left") {
          onNavigateLeftRef.current();
        } else {
          onNavigateRightRef.current();
        }
        setTimeout(() => { navigatingRef.current = false; }, 150);
      }, COMPLETE_DURATION);
    } else {
      resetAll(ALL_TRANSITION);
    }
  }, [applyProgress, resetAll]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!touchStartRef.current || !enabledRef.current || navigatingRef.current) {
      if (swipingRef.current) resetAll(ALL_TRANSITION);
      touchStartRef.current = null;
      directionLockedRef.current = null;
      return;
    }

    if (!swipingRef.current) {
      touchStartRef.current = null;
      directionLockedRef.current = null;
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaTime = Math.max(Date.now() - touchStartRef.current.time, 1);

    touchStartRef.current = null;
    directionLockedRef.current = null;
    finishTouch(deltaX, deltaTime);
  }, [finishTouch, resetAll]);

  const handleTouchCancel = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    touchStartRef.current = null;
    directionLockedRef.current = null;
    if (swipingRef.current) resetAll(ALL_TRANSITION);
  }, [resetAll]);

  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;

    const el = wrapperRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchCancel);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, wrapperRef, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  useEffect(() => {
    resetAll(null);
  }, [resetAll]);
};
