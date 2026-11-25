"use client";

import { useState, useEffect, useRef } from "react";
import { Download01Icon, MultiplicationSignIcon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useTranslations } from "next-intl";
import {
  PWA_DISMISSED_KEY,
  PWA_INSTALLED_KEY,
  isFirefoxAndroid,
} from "@/app/_utils/pwa-utils";

type InstallChoice = {
  outcome: string;
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

const AUTO_PROMPT_DELAY = 30000;

export const InstallPrompt = () => {
  const t = useTranslations();
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(
    null,
  );
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isFirefox, setIsFirefox] = useState(false);
  const promptRef = useRef<InstallPromptEvent | null>(null);
  const autoPromptTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const installedByDisplay =
      window.matchMedia("(display-mode: standalone)").matches;
    const installedByIos =
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true;
    const installedByFlag =
      localStorage.getItem(PWA_INSTALLED_KEY) === "true";

    if (installedByDisplay || installedByIos || installedByFlag) {
      setIsInstalled(true);
      return;
    }

    if (localStorage.getItem(PWA_DISMISSED_KEY)) {
      return;
    }

    if (isFirefoxAndroid()) {
      setIsFirefox(true);
      setShowInstallPrompt(true);
      return;
    }

    const markInstalled = () => {
      setIsInstalled(true);
      localStorage.setItem(PWA_INSTALLED_KEY, "true");
      promptRef.current = null;
      setPromptEvent(null);
      setShowInstallPrompt(false);
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installEvent = e as InstallPromptEvent;
      promptRef.current = installEvent;
      setPromptEvent(installEvent);
      setShowInstallPrompt(true);

      autoPromptTimeoutRef.current = setTimeout(() => {
        const pending = promptRef.current;
        if (!pending) return;
        pending.prompt();
        pending.userChoice.then((choice) => {
          if (choice.outcome === "accepted") {
            markInstalled();
          } else {
            promptRef.current = null;
            setPromptEvent(null);
            setShowInstallPrompt(false);
          }
        });
      }, AUTO_PROMPT_DELAY);
    };

    const handleAppInstalled = () => {
      markInstalled();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
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

    if (isFirefox) return;

    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;

      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        localStorage.setItem(PWA_INSTALLED_KEY, "true");
      }

      promptRef.current = null;
      setPromptEvent(null);
    }

    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    if (autoPromptTimeoutRef.current) {
      clearTimeout(autoPromptTimeoutRef.current);
      autoPromptTimeoutRef.current = null;
    }

    setShowInstallPrompt(false);
    localStorage.setItem(PWA_DISMISSED_KEY, "true");
  };

  if (isInstalled || !showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-[2vw] lg:left-auto lg:right-4 z-50 bg-background border border-border rounded-jotty shadow-lg p-4 w-[96vw] lg:w-[300px]">
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={handleInstallClick}
        >
          <div className="p-2 bg-primary rounded-jotty flex items-center justify-center">
            <Download01Icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-foreground hover:underline">
              {isFirefox
                ? t("pwa.installPromptManualTitle")
                : t("pwa.installPromptTitle")}
            </h3>
            <p className="text-md lg:text-sm text-muted-foreground">
              {isFirefox
                ? t("pwa.installPromptManualMessage")
                : t("pwa.installPromptMessage")}
            </p>
            {isFirefox && (
              <ol className="mt-2 list-decimal list-inside text-md lg:text-sm text-muted-foreground">
                <li>{t("pwa.installPromptManualStepOne")}</li>
                <li>{t("pwa.installPromptManualStepTwo")}</li>
                <li>{t("pwa.installPromptManualStepThree")}</li>
              </ol>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label={t("common.dismiss")}
          >
            <MultiplicationSignIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
