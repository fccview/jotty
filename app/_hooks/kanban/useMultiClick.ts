"use client";

import { useCallback, useEffect, useRef } from "react";

export interface UseMultiClickArgs {
  count?: number;
  windowMs?: number;
  onTrigger: () => void;
  disabled?: boolean;
}

export interface MultiClickState {
  count: number;
  lastAt: number;
}

export const advanceClickStreak = (
  state: MultiClickState,
  now: number,
  count: number,
  windowMs: number,
): { state: MultiClickState; triggered: boolean } => {
  const streakAlive = now - state.lastAt <= windowMs;
  const nextCount = streakAlive ? state.count + 1 : 1;

  if (nextCount >= count) {
    return { state: { count: 0, lastAt: now }, triggered: true };
  }
  return { state: { count: nextCount, lastAt: now }, triggered: false };
};

export const useMultiClick = ({
  count = 3,
  windowMs = 500,
  onTrigger,
  disabled = false,
}: UseMultiClickArgs) => {
  const trackerRef = useRef<MultiClickState>({ count: 0, lastAt: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Avoid recreating handleClick when onTrigger changes (callers commonly
  // pass an inline callback).
  const onTriggerRef = useRef(onTrigger);
  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const reset = useCallback(() => {
    trackerRef.current = { count: 0, lastAt: 0 };
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;

    const { state, triggered } = advanceClickStreak(
      trackerRef.current,
      Date.now(),
      count,
      windowMs,
    );
    trackerRef.current = state;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (triggered) {
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        onTriggerRef.current();
      }, 0);
    }
  }, [count, windowMs, disabled]);

  return { handleClick, reset };
};