"use client";

import { useState, useEffect, useRef } from "react";
import { Download01Icon, MultiplicationSignIcon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useAppMode } from "@/app/_providers/AppModeProvider";

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { isRwMarkable } = useAppMode();
  const autoPromptTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkIfInstalled = () => {
      if (window.matchMedia("(display-mode: standalone)").matches) {
        return true;
      }

      if ((window.navigator as any).standalone === true) {
        return true;
      }

      const wasInstalled = localStorage.getItem("pwa-installed") === "true";
      if (wasInstalled) {
        return true;
      }

      return false;
    };

    if (checkIfInstalled()) {
      setIsInstalled(true);
      return;
    }

    const dismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissed) {
      return;
    }

    const handleAppInstalled = () => {
      setIsInstalled(true);
      localStorage.setItem("pwa-installed", "true");
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);

      autoPromptTimeoutRef.current = setTimeout(() => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === "accepted") {
              handleAppInstalled();
            }
            setDeferredPrompt(null);
            setShowInstallPrompt(false);
          });
        }
      }, 30000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);

      if (autoPromptTimeoutRef.current) {
        clearTimeout(autoPromptTimeoutRef.current);
        autoPromptTimeoutRef.current = null;
      }
    };
  }, []);

  const handleInstallClick = async () => {
    if (autoPromptTimeoutRef.current) {
      clearTimeout(autoPromptTimeoutRef.current);
      autoPromptTimeoutRef.current = null;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setIsInstalled(true);
        localStorage.setItem("pwa-installed", "true");
      }

      setDeferredPrompt(null);
    }

    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    if (autoPromptTimeoutRef.current) {
      clearTimeout(autoPromptTimeoutRef.current);
      autoPromptTimeoutRef.current = null;
    }

    setShowInstallPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed", "true");
  };

  if (isInstalled || !showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-[2vw] lg:left-auto lg:right-4 z-50 bg-background border border-border rounded-lg shadow-lg p-4 w-[96vw] lg:w-[300px]">
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={handleInstallClick}
        >
          <div className="p-2 bg-primary rounded-lg flex items-center justify-center">
            <Download01Icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-foreground hover:underline">
              Install {isRwMarkable ? "rwMarkable" : "jotty·page"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Add to your home screen for quick access
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <MultiplicationSignIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
