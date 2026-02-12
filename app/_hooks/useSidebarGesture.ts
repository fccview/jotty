"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseSidebarGestureProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  enabled: boolean;
}

const EDGE_THRESHOLD = 150;
const COMPLETION_THRESHOLD = 0.35;
const VELOCITY_THRESHOLD = 0.3;
const DIRECTION_LOCK_DISTANCE = 10;
const ANIMATION_DURATION = 300;
const ANIMATION_EASING = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";
const MAIN_SHIFT = 40;

export const useSidebarGesture = ({
  isOpen,
  onOpen,
  onClose,
  enabled,
}: UseSidebarGestureProps) => {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const directionLockedRef = useRef<"horizontal" | "vertical" | null>(null);
  const draggingRef = useRef(false);
  const animatingRef = useRef(false);
  const isOpenRef = useRef(isOpen);
  const enabledRef = useRef(enabled);
  const rafRef = useRef<number | null>(null);

  const getElements = useCallback(() => {
    const sidebar = document.querySelector(".jotty-sidebar") as HTMLElement | null;
    const overlay = document.querySelector(".jotty-sidebar-overlay") as HTMLElement | null;
    const main = document.querySelector(".jotty-layout-main") as HTMLElement | null;
    return { sidebar, overlay, main };
  }, []);

  useEffect(() => {
    isOpenRef.current = isOpen;
    const { main } = getElements();
    if (main) {
      main.style.transition = `transform ${ANIMATION_DURATION}ms ${ANIMATION_EASING}`;
      main.style.transform = isOpen ? `translateX(${MAIN_SHIFT}px)` : "";
    }
  }, [isOpen, getElements]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const getSidebarWidth = useCallback(() => {
    const { sidebar } = getElements();
    return sidebar ? sidebar.offsetWidth : window.innerWidth * 0.88;
  }, [getElements]);

  const applyPosition = useCallback((progress: number, animate: boolean) => {
    const { sidebar, overlay, main } = getElements();
    if (!sidebar || !overlay) return;

    const p = Math.min(Math.max(progress, 0), 1);
    const translateX = -(1 - p) * 100;
    const transition = animate
      ? `transform ${ANIMATION_DURATION}ms ${ANIMATION_EASING}`
      : "none";

    sidebar.style.transition = transition;
    overlay.style.transition = animate
      ? `opacity ${ANIMATION_DURATION}ms ${ANIMATION_EASING}`
      : "none";

    sidebar.style.transform = `translateX(${translateX}%)`;
    overlay.style.opacity = String(p);
    overlay.style.pointerEvents = p > 0 ? "auto" : "none";

    if (main) {
      main.style.transition = transition;
      main.style.transform = `translateX(${p * MAIN_SHIFT}px)`;
    }
  }, [getElements]);

  const clearStyles = useCallback((endedOpen: boolean) => {
    const { sidebar, overlay, main } = getElements();
    if (sidebar) {
      sidebar.style.transition = "";
      sidebar.style.transform = "";
    }
    if (overlay) {
      overlay.style.transition = "";
      overlay.style.opacity = "";
      overlay.style.pointerEvents = "";
    }
    if (main) {
      main.style.transition = "";
      main.style.transform = endedOpen ? `translateX(${MAIN_SHIFT}px)` : "";
    }
  }, [getElements]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabledRef.current || animatingRef.current || window.innerWidth >= 1024) return;
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const isFromEdge = touch.clientX <= EDGE_THRESHOLD;

    if (!isOpenRef.current && !isFromEdge) return;

    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    directionLockedRef.current = null;
    draggingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current || !enabledRef.current || animatingRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (!directionLockedRef.current) {
      const total = Math.abs(deltaX) + Math.abs(deltaY);
      if (total < DIRECTION_LOCK_DISTANCE) return;

      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        directionLockedRef.current = "vertical";
        touchStartRef.current = null;
        return;
      }
      directionLockedRef.current = "horizontal";
      draggingRef.current = true;
    }

    if (directionLockedRef.current !== "horizontal") return;

    if (isOpenRef.current && deltaX > 0) return;
    if (!isOpenRef.current && deltaX < 0) return;

    const sidebarWidth = getSidebarWidth();
    let progress: number;

    if (isOpenRef.current) {
      progress = 1 - Math.abs(deltaX) / sidebarWidth;
    } else {
      progress = touch.clientX / sidebarWidth;
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      applyPosition(progress, false);
    });
  }, [getSidebarWidth, applyPosition]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!touchStartRef.current || !draggingRef.current || !enabledRef.current || animatingRef.current) {
      touchStartRef.current = null;
      directionLockedRef.current = null;
      draggingRef.current = false;
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaTime = Math.max(Date.now() - touchStartRef.current.time, 1);
    const velocity = Math.abs(deltaX) / deltaTime;
    const sidebarWidth = getSidebarWidth();
    const progress = Math.abs(deltaX) / sidebarWidth;
    const meetsThreshold = progress > COMPLETION_THRESHOLD || velocity > VELOCITY_THRESHOLD;

    animatingRef.current = true;

    if (isOpenRef.current) {
      if (deltaX < 0 && meetsThreshold) {
        applyPosition(0, true);
        setTimeout(() => {
          clearStyles(false);
          onClose();
          animatingRef.current = false;
        }, ANIMATION_DURATION);
      } else {
        applyPosition(1, true);
        setTimeout(() => {
          clearStyles(true);
          animatingRef.current = false;
        }, ANIMATION_DURATION);
      }
    } else {
      if (deltaX > 0 && meetsThreshold) {
        applyPosition(1, true);
        setTimeout(() => {
          clearStyles(true);
          onOpen();
          animatingRef.current = false;
        }, ANIMATION_DURATION);
      } else {
        applyPosition(0, true);
        setTimeout(() => {
          clearStyles(false);
          animatingRef.current = false;
        }, ANIMATION_DURATION);
      }
    }

    touchStartRef.current = null;
    directionLockedRef.current = null;
    draggingRef.current = false;
  }, [getSidebarWidth, applyPosition, clearStyles, onOpen, onClose]);

  const handleTouchCancel = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    touchStartRef.current = null;
    directionLockedRef.current = null;

    if (draggingRef.current) {
      const target = isOpenRef.current ? 1 : 0;
      applyPosition(target, true);
      setTimeout(() => {
        clearStyles(isOpenRef.current);
        animatingRef.current = false;
      }, ANIMATION_DURATION);
    }
    draggingRef.current = false;
  }, [applyPosition, clearStyles]);

  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
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
};
