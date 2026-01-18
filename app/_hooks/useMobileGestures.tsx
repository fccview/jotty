"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseMobileGesturesProps {
  onSwipeRight?: () => void;
  enabled?: boolean;
  swipeThreshold?: number;
  edgeThreshold?: number;
  velocityThreshold?: number;
}

export const useMobileGestures = ({
  onSwipeRight,
  enabled = true,
  swipeThreshold = 15,
  edgeThreshold = 300,
  velocityThreshold = 0.02,
}: UseMobileGesturesProps = {}) => {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null
  );
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (window.innerWidth >= 1024 || e.touches.length === 0) {
        return;
      }

      const touch = e.touches[0];

      if (touch.clientX > edgeThreshold) {
        return;
      }

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    },
    [edgeThreshold]
  );

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    if (Math.abs(deltaX) > 10) {
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStartRef.current || !onSwipeRight || !enabledRef.current) {
        touchStartRef.current = null;
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;
      const velocity = Math.abs(deltaX) / deltaTime;

      const isHorizontalDominant = Math.abs(deltaY) < Math.abs(deltaX) * 1.5;
      const isValidSwipe =
        deltaX > swipeThreshold &&
        isHorizontalDominant &&
        velocity > velocityThreshold;

      if (isValidSwipe) {
        onSwipeRight();
      }

      touchStartRef.current = null;
    },
    [onSwipeRight, swipeThreshold, velocityThreshold]
  );

  useEffect(() => {
    if (typeof window === "undefined" || !enabled) {
      return;
    }

    document.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    enabled,
    swipeThreshold,
    edgeThreshold,
    velocityThreshold,
  ]);
};
