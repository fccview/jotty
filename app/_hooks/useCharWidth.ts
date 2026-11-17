"use client";

import { useEffect, useState } from "react";

const MEASURE_CLASS = "markdown-line-measure";
const SAMPLE_LENGTH = 100;

const measureCharWidth = () => {
  const el = document.createElement("span");
  el.className = MEASURE_CLASS;
  el.textContent = "x".repeat(SAMPLE_LENGTH);
  document.body.append(el);
  const { fontSize, fontFamily } = getComputedStyle(el);
  const width = el.offsetWidth / SAMPLE_LENGTH;
  el.remove();
  return { width, font: `${fontSize} ${fontFamily}` };
};

export const useCharWidth = () => {
  const [charWidth, setCharWidth] = useState(0);

  useEffect(() => {
    let active = true;
    const { width, font } = measureCharWidth();
    setCharWidth(width);

    document.fonts
      ?.load(font)
      .then(() => {
        if (active) setCharWidth(measureCharWidth().width);
      })
      .catch((error) => console.error("Failed to load editor font", error));

    return () => {
      active = false;
    };
  }, []);

  return charWidth;
};
