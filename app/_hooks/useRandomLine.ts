"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

const hashOf = (seed: string): number =>
  Array.from(seed).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);

export const useRandomLine = (key: string, seed?: string): string => {
  const t = useTranslations();
  const lines = useMemo(() => t.raw(key) as string[], [t, key]);
  const [index, setIndex] = useState(() =>
    seed ? hashOf(seed) % lines.length : 0,
  );

  useEffect(() => {
    if (seed) return;
    setIndex(Math.floor(Math.random() * lines.length));
  }, [seed, lines.length]);

  return lines[index % lines.length];
};
