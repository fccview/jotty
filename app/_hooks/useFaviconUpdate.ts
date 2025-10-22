"use client";

import { useCallback } from "react";
import { getSettings } from "@/app/_server/actions/config";
import { useAppMode } from "@/app/_providers/AppModeProvider";

export const useFaviconUpdate = () => {
  const { isRwMarkable } = useAppMode();
  const updateFavicons = useCallback(async () => {
    try {
      const settings = await getSettings();

      if (isRwMarkable) {
        let mainFavicon = document.querySelector(
          'link[rel="icon"]:not([sizes])'
        ) as HTMLLinkElement;

        if (mainFavicon) {
          mainFavicon.href = "/app-icons/legacy/favicon.ico";
        }
      }

      if (settings["16x16Icon"]) {
        let favicon16 = document.querySelector(
          'link[rel="icon"][sizes="16x16"]'
        ) as HTMLLinkElement;
        if (!favicon16) {
          favicon16 = document.createElement("link");
          favicon16.rel = "icon";
          favicon16.sizes = "16x16";
          favicon16.type = "image/png";
          document.head.appendChild(favicon16);
        }
        favicon16.href = settings["16x16Icon"];

        let mainFavicon = document.querySelector(
          'link[rel="icon"]:not([sizes])'
        ) as HTMLLinkElement;
        if (!mainFavicon) {
          mainFavicon = document.createElement("link");
          mainFavicon.rel = "icon";
          mainFavicon.type = "image/png";
          document.head.appendChild(mainFavicon);
        }
        mainFavicon.href = settings["16x16Icon"];
      }

      if (settings["32x32Icon"]) {
        let favicon32 = document.querySelector(
          'link[rel="icon"][sizes="32x32"]'
        ) as HTMLLinkElement;
        if (!favicon32) {
          favicon32 = document.createElement("link");
          favicon32.rel = "icon";
          favicon32.sizes = "32x32";
          favicon32.type = "image/png";
          document.head.appendChild(favicon32);
        }
        favicon32.href = settings["32x32Icon"];

        let mainFavicon = document.querySelector(
          'link[rel="icon"]:not([sizes])'
        ) as HTMLLinkElement;
        if (!mainFavicon) {
          mainFavicon = document.createElement("link");
          mainFavicon.rel = "icon";
          mainFavicon.type = "image/png";
          document.head.appendChild(mainFavicon);
        }
        mainFavicon.href = settings["32x32Icon"];
      }

      if (settings["180x180Icon"]) {
        let appleTouchIcon = document.querySelector(
          'link[rel="apple-touch-icon"]'
        ) as HTMLLinkElement;
        if (!appleTouchIcon) {
          appleTouchIcon = document.createElement("link");
          appleTouchIcon.rel = "apple-touch-icon";
          appleTouchIcon.sizes = "180x180";
          appleTouchIcon.type = "image/png";
          document.head.appendChild(appleTouchIcon);
        }
        appleTouchIcon.href = settings["180x180Icon"];
      }

      if (settings.appName) {
        document.title = settings.appName;
      }
    } catch (error) {
      console.error("Error updating favicons:", error);
    }
  }, []);

  return { updateFavicons };
};
