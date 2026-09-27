"use client";

import { useMemo } from "react";
import { SVG_FRAME_ATTR } from "@/app/_consts/notes";

const SVG_DATA_PREFIX = "data:image/svg+xml;charset=utf-8,";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const SVG_DATA_URI = /^data:image\/svg\+xml[;,]/i;
const SVG_WITHOUT_NS = /<svg\b(?![^>]*\sxmlns=)/i;

const toSvgSrc = (svg: string): string => {
  const trimmed = svg.trim();
  if (SVG_DATA_URI.test(trimmed)) return trimmed;

  const namespaced = trimmed.replace(
    SVG_WITHOUT_NS,
    `<svg xmlns="${SVG_NAMESPACE}"`,
  );
  return `${SVG_DATA_PREFIX}${encodeURIComponent(namespaced)}`;
};

interface SvgFrameProps {
  svg: string;
  alt: string;
}

export const SvgFrame = ({ svg, alt }: SvgFrameProps) => {
  const src = useMemo(() => toSvgSrc(svg), [svg]);

  return (
    <img
      src={src}
      alt={alt}
      className="max-w-full h-auto my-0"
      {...{ [SVG_FRAME_ATTR]: "" }}
    />
  );
};
