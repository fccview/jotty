"use client";

import { useState, useEffect, useRef } from "react";
import { ImageIcon, X } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";

interface CompactImageResizeOverlayProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onResize: (width: number | null, height: number | null) => void;
  onPreviewUpdate?: (width: number | null, height: number | null) => void;
  currentWidth?: number;
  currentHeight?: number;
  imageUrl?: string;
  targetElement?: HTMLElement;
}

export const CompactImageResizeOverlay = ({
  isVisible,
  position,
  onClose,
  onResize,
  onPreviewUpdate,
  currentWidth,
  currentHeight,
  imageUrl,
  targetElement,
}: CompactImageResizeOverlayProps) => {
  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) {
      setWidth(currentWidth?.toString() || "");
      setHeight(currentHeight?.toString() || "");
    }
  }, [isVisible, currentWidth, currentHeight]);

  useEffect(() => {
    if (!isVisible || !targetElement) return;

    const updatePosition = () => {
      if (targetElement && overlayRef.current) {
        const rect = targetElement.getBoundingClientRect();
        overlayRef.current.style.left = `${rect.left + rect.width / 2}px`;
        overlayRef.current.style.top = `${rect.top}px`;
      }
    };

    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isVisible, targetElement]);

  const handleWidthChange = (value: string) => {
    setWidth(value);

    if (onPreviewUpdate) {
      const widthNum = value && value.trim() !== "" ? parseInt(value) : null;
      onPreviewUpdate(widthNum, height ? parseInt(height) : null);
    }
  };

  const handleHeightChange = (value: string) => {
    setHeight(value);

    if (onPreviewUpdate) {
      const heightNum = value && value.trim() !== "" ? parseInt(value) : null;
      onPreviewUpdate(width ? parseInt(width) : null, heightNum);
    }
  };

  const handleApply = () => {
    const widthNum = width && width.trim() !== "" ? parseInt(width) : null;
    const heightNum = height && height.trim() !== "" ? parseInt(height) : null;
    onResize(widthNum, heightNum);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div
      ref={overlayRef}
      data-overlay
      className="fixed z-50 bg-card border border-border rounded-lg shadow-lg p-3 min-w-64"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -120%)",
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            <span className="font-medium text-sm">Resize Image</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            id="width"
            label="Width (px)"
            type="number"
            defaultValue={width}
            value={width}
            onChange={(e) => handleWidthChange(e.target.value)}
            placeholder="Auto"
            className="text-xs"
          />
          <Input
            id="height"
            label="Height (px)"
            type="number"
            defaultValue={height}
            value={height}
            onChange={(e) => handleHeightChange(e.target.value)}
            placeholder="Auto"
            className="text-xs"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleApply} className="text-xs">
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
};
