"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSaveQueue, SaveState } from "@/app/_utils/autosave-utils";

interface UseAutosaveProps<T> {
  enabled: boolean;
  save: (value: T) => Promise<boolean>;
}

export const useAutosave = <T>({ enabled, save }: UseAutosaveProps<T>) => {
  const [state, setState] = useState(SaveState.IDLE);
  const saveRef = useRef(save);
  saveRef.current = save;
  const [queue] = useState(() =>
    createSaveQueue<T>({
      save: (value) => saveRef.current(value),
      onState: setState,
    }),
  );

  const push = useCallback(
    (value: T) => {
      if (enabled) queue.push(value);
    },
    [enabled, queue],
  );

  const reset = useCallback(() => {
    queue.reset();
    setState(SaveState.IDLE);
  }, [queue]);

  useEffect(() => {
    if (!enabled) return;
    const flushNow = () => void queue.flush();
    const flushHidden = () => {
      if (document.visibilityState === "hidden") flushNow();
    };
    window.addEventListener("blur", flushNow);
    window.addEventListener("pagehide", flushNow);
    document.addEventListener("visibilitychange", flushHidden);
    return () => {
      window.removeEventListener("blur", flushNow);
      window.removeEventListener("pagehide", flushNow);
      document.removeEventListener("visibilitychange", flushHidden);
    };
  }, [enabled, queue]);

  return {
    state,
    push,
    flush: queue.flush,
    reset,
    hasUnsaved: state === SaveState.SAVING || state === SaveState.FAILED,
  };
};
