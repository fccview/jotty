"use client";

import { useMemo } from "react";
import { SVG_FRAME_ATTR } from "@/app/_consts/notes";
import { svgNaturalSize, toSvgSrc } from "@/app/_utils/svg-frame-utils";

interface SvgFrameProps {
  svg: string;
  alt: string;
}

export const SvgFrame = ({ svg, alt }: SvgFrameProps) => {
  const src = useMemo(() => toSvgSrc(svg), [svg]);
  const size = useMemo(() => svgNaturalSize(svg), [svg]);

  return (
    <img
      src={src}
      alt={alt}
      width={size?.width}
      height={size?.height}
      className="block max-w-full h-auto my-0"
      {...{ [SVG_FRAME_ATTR]: "" }}
    />
  );
};
