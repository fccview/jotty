"use client";

import { useState, useEffect } from "react";
import { AppSettings } from "@/app/_types/index";
import { getAppSettings } from "@/app/_server/actions/config/index";

export const useEditorSettings = () => {
  const [settings, setSettings] = useState<AppSettings["editor"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await getAppSettings();
        if (result.success && result.data) {
          setSettings(
            result.data.editor || {
              enableSlashCommands: true,
              enableBubbleMenu: true,
              enableTableToolbar: true,
              enableBilateralLinks: true,
            }
          );
        } else {
          setSettings({
            enableSlashCommands: true,
            enableBubbleMenu: true,
            enableTableToolbar: true,
            enableBilateralLinks: true,
          });
        }
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
