"use client";

import { useEffect, useState } from "react";
import { ThemeTone } from "@/app/_consts/diagrams";

interface ThemeSnapshot {
  tone: ThemeTone;
  key: string;
}

const LIGHT_SNAPSHOT: ThemeSnapshot = { tone: ThemeTone.Light, key: "" };
const DARK_LUMINANCE = 0.5;

const readSnapshot = (): ThemeSnapshot => {
  if (typeof window === "undefined") return LIGHT_SNAPSHOT;
  const root = document.documentElement;
  const background = getComputedStyle(root).getPropertyValue("--background").trim();
  const [r, g, b] = background.split(/[\s,]+/).map(Number);
  const luminance = [r, g, b].every(Number.isFinite)
    ? (0.299 * r + 0.587 * g + 0.114 * b) / 255
    : 1;
  return {
    tone: luminance < DARK_LUMINANCE ? ThemeTone.Dark : ThemeTone.Light,
    key: `${root.className}|${root.getAttribute("style") || ""}|${background}`,
  };
};

export const useThemeTone = (): ThemeSnapshot => {
  const [snapshot, setSnapshot] = useState<ThemeSnapshot>(readSnapshot);

  useEffect(() => {
    const update = () =>
      setSnapshot((previous) => {
        const next = readSnapshot();
        return next.key === previous.key ? previous : next;
      });
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return snapshot;
};
