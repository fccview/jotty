"use client";

import { useEffect, useState } from "react";
import { getAllThemes } from "@/app/_consts/themes";
import { DropdownOption } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";

export const useThemeOptions = (isWanted = true): DropdownOption[] | null => {
  const [themes, setThemes] = useState<DropdownOption[] | null>(null);

  useEffect(() => {
    if (!isWanted || themes) return;

    const summonThemes = async () => {
      try {
        const loaded = await getAllThemes();
        setThemes(
          loaded.map(({ id, name, icon, colors }) => ({ id, name, icon, colors })),
        );
      } catch (error) {
        console.error("Failed to load themes:", error);
        setThemes([]);
      }
    };

    summonThemes();
  }, [isWanted, themes]);

  return themes;
};
