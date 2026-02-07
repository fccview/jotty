"use client";

import { useEffect, useRef, useCallback, RefObject } from "react";

interface UseSwipeNavigationProps {
  enabled: boolean;
  onNavigateLeft: () => void;
  onNavigateRight: () => void;
  containerRef: RefObject<HTMLDivElement | null>;
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

export const useSwipeNavigation = ({
  enabled,
  onNavigateLeft,
  onNavigateRight,
  containerRef,
  hasPrev,
  hasNext,
}: UseSwipeNavigationProps) => {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const directionLockedRef = useRef<"horizontal" | "vertical" | null>(null);
  const navigatingRef = useRef(false);
  const swipingRef = useRef(false);
  const currentDeltaRef = useRef(0);
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

  const setTransform = useCallback((deltaX: number, transition: string | null) => {
    const container = containerRef.current;
    if (!container) return;

    const screenWidth = window.innerWidth;
    const baseOffset = -screenWidth;

    container.style.transition = transition || "none";
    container.style.transform = `translateX(${baseOffset + deltaX}px)`;
  }, [containerRef]);

  const resetPosition = useCallback(() => {
    setTransform(0, `transform ${SNAP_DURATION}ms ${SNAP_EASING}`);
    swipingRef.current = false;
    currentDeltaRef.current = 0;
  }, [setTransform]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabledRef.current || navigatingRef.current || window.innerWidth >= 1024) return;
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    directionLockedRef.current = null;
    swipingRef.current = false;
    currentDeltaRef.current = 0;

    const container = containerRef.current;
    if (container) container.style.transition = "none";
  }, [containerRef]);

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

    e.preventDefault();

    const swipingLeft = deltaX < 0;
    const swipingRight = deltaX > 0;

    let adjustedDelta = deltaX;
    if ((swipingLeft && !hasNextRef.current) || (swipingRight && !hasPrevRef.current)) {
      adjustedDelta = deltaX * RESISTANCE_FACTOR;
    }

    currentDeltaRef.current = adjustedDelta;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setTransform(adjustedDelta, null);
    });
  }, [setTransform]);

  const finishTouch = useCallback((deltaX: number, deltaTime: number) => {
    const velocity = Math.abs(deltaX) / deltaTime;
    const screenWidth = window.innerWidth;
    const progress = Math.abs(deltaX) / screenWidth;

    const swipingLeft = deltaX < 0;
    const swipingRight = deltaX > 0;

    const meetsThreshold = progress > COMPLETION_THRESHOLD || velocity > VELOCITY_THRESHOLD;

    if (swipingLeft && hasNextRef.current && meetsThreshold) {
      navigatingRef.current = true;
      setTransform(-screenWidth, `transform ${COMPLETE_DURATION}ms ${COMPLETE_EASING}`);
      setTimeout(() => {
        onNavigateLeftRef.current();
        setTimeout(() => { navigatingRef.current = false; }, 150);
      }, COMPLETE_DURATION);
    } else if (swipingRight && hasPrevRef.current && meetsThreshold) {
      navigatingRef.current = true;
      setTransform(screenWidth, `transform ${COMPLETE_DURATION}ms ${COMPLETE_EASING}`);
      setTimeout(() => {
        onNavigateRightRef.current();
        setTimeout(() => { navigatingRef.current = false; }, 150);
      }, COMPLETE_DURATION);
    } else {
      resetPosition();
    }
  }, [setTransform, resetPosition]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!touchStartRef.current || !enabledRef.current || navigatingRef.current) {
      if (swipingRef.current) resetPosition();
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
  }, [finishTouch, resetPosition]);

  const handleTouchCancel = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    touchStartRef.current = null;
    directionLockedRef.current = null;

    if (swipingRef.current) {
      resetPosition();
    }
  }, [resetPosition]);

  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    document.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchCancel);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  useEffect(() => {
    setTransform(0, null);
  }, [setTransform]);
};
