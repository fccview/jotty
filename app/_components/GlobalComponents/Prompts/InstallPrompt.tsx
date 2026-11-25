"use client";

import { useState, useEffect } from "react";
import { Download01Icon, MultiplicationSignIcon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useTranslations } from "next-intl";
import {
  PWA_DISMISSED_KEY,
  PWA_INSTALLED_KEY,
  isFirefoxAndroid,
} from "@/app/_utils/pwa-utils";

type InstallChoice = {
  outcome: "accepted" | "dismissed";
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

export const InstallPrompt = () => {
  const t = useTranslations();
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(
    null,
  );
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isFirefox, setIsFirefox] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const installedByDisplay =
      window.matchMedia("(display-mode: standalone)").matches;
    const installedByIos =
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true;

    if (installedByDisplay || installedByIos) {
      setIsInstalled(true);
      return;
    }

    if (localStorage.getItem(PWA_INSTALLED_KEY) === "true") {
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

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
      setShowInstallPrompt(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      localStorage.setItem(PWA_INSTALLED_KEY, "true");
      setPromptEvent(null);
      setShowInstallPrompt(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;

      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        localStorage.setItem(PWA_INSTALLED_KEY, "true");
      }

      setPromptEvent(null);
    }

    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem(PWA_DISMISSED_KEY, "true");
  };

  if (isInstalled || !showInstallPrompt) {
    return null;
  }

  const installIcon = (
    <span className="p-2 bg-primary rounded-jotty flex items-center justify-center">
      <Download01Icon className="h-5 w-5 text-primary-foreground" />
    </span>
  );

  return (
    <div className="fixed bottom-4 left-[2vw] lg:left-auto lg:right-4 z-50 bg-background border border-border rounded-jotty shadow-lg p-4 w-[96vw] lg:w-[300px]">
      <div className="flex items-center justify-between">
        {isFirefox ? (
          <div className="flex items-center gap-3">
            {installIcon}
            <div>
              <h3 className="font-medium text-foreground">
                {t("pwa.installPromptManualTitle")}
              </h3>
              <p className="text-md lg:text-sm text-muted-foreground">
                {t("pwa.installPromptManualMessage")}
              </p>
              <ol className="mt-2 list-decimal list-inside text-md lg:text-sm text-muted-foreground">
                <li>{t("pwa.installPromptManualStepOne")}</li>
                <li>{t("pwa.installPromptManualStepTwo")}</li>
                <li>{t("pwa.installPromptManualStepThree")}</li>
              </ol>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleInstallClick}
            className="group flex items-center gap-3 text-left cursor-pointer"
          >
            {installIcon}
            <span>
              <span className="block font-medium text-foreground group-hover:underline">
                {t("pwa.installPromptTitle")}
              </span>
              <span className="block text-md lg:text-sm text-muted-foreground">
                {t("pwa.installPromptMessage")}
              </span>
            </span>
          </button>
        )}
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
