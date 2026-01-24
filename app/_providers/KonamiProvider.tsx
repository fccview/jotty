"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getTextNodes,
  startChaos,
  resetChaos,
  KONAMI_CODE,
} from "../_utils/konami-utils";
import {
  getSpecialTranslationForTrigger,
  SPECIAL_TRANSLATION_TRIGGERS,
} from "../_utils/special-translations-utils";
import { updateUserSettings } from "../_server/actions/users";
import { useAppMode } from "./AppModeProvider";
import { useRouter } from "next/navigation";

const ChaosContext = createContext<{
  isChaos: boolean;
  toggleChaos: () => void;
} | null>(null);

export const useChaos = () => {
  const ctx = useContext(ChaosContext);
  if (!ctx) throw new Error("useChaos must be used within ChaosProvider");
  return ctx;
};

/**
 * @fccview here, I used to always add easter eggs to my websites/app growing up and since
 * I became a tech lead my job has been so serious I haven't been able to have much fun with things.
 * If you found this in the codebase... try typing ↑ ↑ ↓ ↓ ← → ← → B A and see what happens.
 *
 * Thank you for using Jotty <3
 */
export function KonamiProvider({ children }: { children: React.ReactNode }) {
  const [isChaos, setIsChaos] = useState(false);
  const observer = useRef<MutationObserver | null>(null);
  const content = useRef<Map<Text, string>>(new Map());
  const konamiSequence = useRef<string[]>([]);
  const specialTranslationSequence = useRef<string>("");
  const { setUser } = useAppMode();
  const router = useRouter();
  const routerRef = useRef(router);

  const apply = useCallback(
    () => startChaos(getTextNodes(document.body), content.current),
    []
  );

  const reset = useCallback(() => {
    resetChaos(content.current);
  }, []);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInEditor =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.getAttribute("contenteditable") === "true" ||
        activeElement?.closest('[contenteditable="true"]') !== null;

      if (isInEditor) {
        return;
      }

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
        specialTranslationSequence.current += key;
        const maxLength = Math.max(
          ...Object.values(SPECIAL_TRANSLATION_TRIGGERS).map((t) => t.length)
        );
        if (specialTranslationSequence.current.length > maxLength) {
          specialTranslationSequence.current =
            specialTranslationSequence.current.slice(-maxLength);
        }

        const specialTranslation = getSpecialTranslationForTrigger(
          specialTranslationSequence.current
        );
        if (specialTranslation) {
          updateUserSettings({ preferredLocale: specialTranslation }).then(
            (result) => {
              if (result.success && result.data?.user) {
                setUser(result.data.user);
                routerRef.current.refresh();
              }
            }
          );
          specialTranslationSequence.current = "";
        } else {
          const possibleMatch = Object.values(SPECIAL_TRANSLATION_TRIGGERS).some(
            (trigger) => trigger.startsWith(specialTranslationSequence.current)
          );
          if (!possibleMatch) {
            specialTranslationSequence.current = "";
          }
        }
      } else {
        specialTranslationSequence.current = "";
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setUser]);

  useEffect(() => {
    if (!isChaos) return reset();
    apply();
  }, [isChaos, apply, reset]);

  return (
    <ChaosContext.Provider
      value={{ isChaos, toggleChaos: () => setIsChaos((p) => !p) }}
    >
      {children}
    </ChaosContext.Provider>
  );
}
