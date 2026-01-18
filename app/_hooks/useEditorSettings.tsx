"use client";

import { useState, useEffect } from "react";
import { AppSettings } from "@/app/_types/index";
import { getSettings } from "@/app/_server/actions/config/index";

export const useEditorSettings = () => {
  const [settings, setSettings] = useState<AppSettings["editor"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await getSettings();
        setSettings(
          result?.editor || {
            enableSlashCommands: true,
            enableBubbleMenu: true,
            enableTableToolbar: true,
            enableBilateralLinks: true,
          }
        );
      } catch (error) {
        setSettings({
          enableSlashCommands: true,
          enableBubbleMenu: true,
          enableTableToolbar: true,
          enableBilateralLinks: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  return { settings, isLoading };
};
