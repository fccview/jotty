"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

interface ImageOverlayProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
  autoCloseMs?: number;
  width?: number;
  height?: number;
}

export function ImageOverlay({
  src,
  alt = "",
  onClose,
  autoCloseMs,
  width = 400,
  height = 300,
}: ImageOverlayProps) {
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalElement(document.body);
  }, []);

  useEffect(() => {
    if (!src) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [src, onClose]);

  useEffect(() => {
    if (!src || !autoCloseMs) return;

    const timeout = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(timeout);
  }, [src, autoCloseMs, onClose]);

  if (!src || !portalElement) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex lg:items-center lg:justify-center items-end z-50"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          unoptimized
          className="max-w-[90vw] max-h-[85vh] w-auto h-auto"
        />
      </div>
    </div>,
    portalElement
  );
}
