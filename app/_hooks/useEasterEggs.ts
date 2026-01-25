"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSpecialTranslationForTrigger,
  SPECIAL_TRANSLATION_GIFS,
  SPECIAL_TRANSLATION_TRIGGERS,
  type SpecialTranslation,
} from "../_utils/special-translations-utils";
import { KONAMI_CODE } from "../_utils/konami-utils";

interface UseEasterEggsOptions {
  onSpecialTranslation?: (translation: SpecialTranslation) => void;
}

interface UseEasterEggsReturn {
  isChaos: boolean;
  toggleChaos: () => void;
  activeGif: string | null;
  clearGif: () => void;
}

export function useEasterEggs({
  onSpecialTranslation,
}: UseEasterEggsOptions = {}): UseEasterEggsReturn {
  const [isChaos, setIsChaos] = useState(false);
  const [activeGif, setActiveGif] = useState<string | null>(null);

  const konamiSequence = useRef<string[]>([]);
  const specialSequence = useRef<string>("");
  const gifTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showGif = useCallback((gif: string) => {
    if (gifTimeoutRef.current) {
      clearTimeout(gifTimeoutRef.current);
    }
    setActiveGif(gif);
    gifTimeoutRef.current = setTimeout(() => {
      setActiveGif(null);
      gifTimeoutRef.current = null;
    }, 3000);
  }, []);

  const toggleChaos = useCallback(() => setIsChaos((p) => !p), []);

  const clearGif = useCallback(() => {
    if (gifTimeoutRef.current) {
      clearTimeout(gifTimeoutRef.current);
      gifTimeoutRef.current = null;
    }
    setActiveGif(null);
  }, []);

  useEffect(() => {
    return () => {
      if (gifTimeoutRef.current) {
        clearTimeout(gifTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const isInEditor = () => {
      const el = document.activeElement;
      return (
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA" ||
        el?.getAttribute("contenteditable") === "true" ||
        el?.closest('[contenteditable="true"]') !== null
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInEditor()) return;

      const key = e.key.toLowerCase();

      const expectedKey =
        KONAMI_CODE[konamiSequence.current.length]?.toLowerCase();

      if (key === expectedKey) {
        konamiSequence.current.push(key);
        if (konamiSequence.current.length === KONAMI_CODE.length) {
          setIsChaos((prev) => !prev);
          konamiSequence.current = [];
        }
      } else {
        konamiSequence.current = [];
      }

      if (key.length === 1 && /[a-z]/i.test(key)) {
        specialSequence.current += key;

        const maxLength = Math.max(
          ...Object.values(SPECIAL_TRANSLATION_TRIGGERS).map((t) => t.length)
        );
        if (specialSequence.current.length > maxLength) {
          specialSequence.current = specialSequence.current.slice(-maxLength);
        }

        const translation = getSpecialTranslationForTrigger(
          specialSequence.current
        );

        if (translation) {
          showGif(SPECIAL_TRANSLATION_GIFS[translation]);
          onSpecialTranslation?.(translation);
          specialSequence.current = "";
        } else {
          const possibleMatch = Object.values(
            SPECIAL_TRANSLATION_TRIGGERS
          ).some((trigger) =>
            trigger.startsWith(specialSequence.current)
          );
          if (!possibleMatch) {
            specialSequence.current = "";
          }
        }
      } else {
        specialSequence.current = "";
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSpecialTranslation, showGif]);

  return { isChaos, toggleChaos, activeGif, clearGif };
}
