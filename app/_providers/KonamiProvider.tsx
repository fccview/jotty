"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import {
  getTextNodes,
  startChaos,
  resetChaos,
} from "../_utils/konami-utils";
import { updateUserSettings } from "../_server/actions/users";
import { useAppMode } from "./AppModeProvider";
import { useRouter } from "next/navigation";
import { useEasterEggs } from "../_hooks/useEasterEggs";
import { Modal } from "../_components/GlobalComponents/Modals/Modal";
import Image from "next/image";

const ChaosContext = createContext<{
  isChaos: boolean;
  toggleChaos: () => void;
} | null>(null);

export const useChaos = () => {
  const ctx = useContext(ChaosContext);
  if (!ctx) throw new Error("useChaos must be used within ChaosProvider");
  return ctx;
};

export function KonamiProvider({ children }: { children: React.ReactNode }) {
  const content = useRef<Map<Text, string>>(new Map());
  const { setUser } = useAppMode();
  const router = useRouter();
  const routerRef = useRef(router);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const handleSpecialTranslation = useCallback(
    (translation: string) => {
      updateUserSettings({ preferredLocale: translation }).then((result) => {
        if (result.success && result.data?.user) {
          setUser(result.data.user);
          routerRef.current.refresh();
        }
      });
    },
    [setUser]
  );

  const { isChaos, toggleChaos, activeGif, clearGif } = useEasterEggs({
    onSpecialTranslation: handleSpecialTranslation,
  });

  const apply = useCallback(
    () => startChaos(getTextNodes(document.body), content.current),
    []
  );

  const reset = useCallback(() => {
    resetChaos(content.current);
  }, []);

  useEffect(() => {
    if (!isChaos) return reset();
    apply();
  }, [isChaos, apply, reset]);

  return (
    <ChaosContext.Provider value={{ isChaos, toggleChaos }}>
      {children}
      <Modal
        isOpen={!!activeGif}
        onClose={clearGif}
        title=""
        className="!p-0 !border-0 !bg-transparent !shadow-none lg:!max-w-fit"
      >
        {activeGif && (
          <Image
            src={activeGif}
            alt="Easter egg"
            width={400}
            height={300}
            unoptimized
            className="rounded-lg"
          />
        )}
      </Modal>
    </ChaosContext.Provider>
  );
}
