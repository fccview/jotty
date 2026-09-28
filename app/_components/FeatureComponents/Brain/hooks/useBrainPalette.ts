"use client";

import { useEffect, useState } from "react";
import type { BrainPalette, Rgb } from "../utils/brain-graph";

const FALLBACK: BrainPalette = {
  primary: [139, 59, 208],
  foreground: [15, 23, 42],
  muted: [100, 116, 139],
  background: [255, 255, 255],
  card: [255, 255, 255],
  border: [226, 232, 240],
};

const _triple = (
  styles: CSSStyleDeclaration,
  name: string,
  fallback: Rgb,
): Rgb => {
  const parts = styles
    .getPropertyValue(name)
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((value) => Number.isFinite(value));
  return parts.length >= 3 ? [parts[0], parts[1], parts[2]] : fallback;
};

const _read = (): BrainPalette => {
  const styles = getComputedStyle(document.documentElement);
  return {
    primary: _triple(styles, "--primary", FALLBACK.primary),
    foreground: _triple(styles, "--foreground", FALLBACK.foreground),
    muted: _triple(styles, "--muted-foreground", FALLBACK.muted),
    background: _triple(styles, "--background", FALLBACK.background),
    card: _triple(styles, "--card", FALLBACK.card),
    border: _triple(styles, "--border", FALLBACK.border),
  };
};

export const useBrainPalette = (): BrainPalette => {
  const [palette, setPalette] = useState<BrainPalette>(FALLBACK);

  useEffect(() => {
    const update = () => setPalette(_read());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return palette;
};
