"use client";

import { useState, useRef, useEffect } from "react";
import {
  PaintBrush04Icon,
  MultiplicationSignIcon,
  Tick02Icon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { cn } from "@/app/_utils/global-utils";
import { useTranslations } from "next-intl";

interface ColorPickerProps {
  isVisible: boolean;
  onClose: () => void;
  onColorSelect: (color: string) => void;
  currentColor?: string;
  type: "text" | "highlight";
  position?: { x: number; y: number };
  targetElement?: HTMLElement;
}

const PRESET_COLORS = [
  { name: "Default", value: "" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Gray", value: "#6b7280" },
];

const HIGHLIGHT_COLORS = [
  { name: "None", value: "" },
  { name: "Yellow", value: "#fef08a" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Blue", value: "#bfdbfe" },
  { name: "Purple", value: "#e9d5ff" },
  { name: "Pink", value: "#fce7f3" },
  { name: "Orange", value: "#fed7aa" },
  { name: "Red", value: "#fecaca" },
  { name: "Gray", value: "#f3f4f6" },
];

export const ColorPicker = ({
  isVisible,
  onClose,
  onColorSelect,
  currentColor = "",
  type,
  position,
  targetElement,
}: ColorPickerProps) => {
  const t = useTranslations();
  const [customColor, setCustomColor] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const colors = type === "text" ? PRESET_COLORS : HIGHLIGHT_COLORS;

  useEffect(() => {
    if (!isVisible || !targetElement || !pickerRef.current) return;

    const updatePosition = () => {
      if (targetElement && pickerRef.current) {
        const rect = targetElement.getBoundingClientRect();
        const pickerRect = pickerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        let top = rect.top - pickerRect.height - 8;
        let left = rect.left;

        if (top < 0) {
          top = rect.bottom + 8;
        }

        if (left + pickerRect.width > viewportWidth) {
          left = viewportWidth - pickerRect.width - 8;
        }

        if (left < 0) {
          left = 8;
        }

        pickerRef.current.style.left = `${left}px`;
        pickerRef.current.style.top = `${top}px`;
      }
    };

    updatePosition();

    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isVisible, targetElement]);

  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    onClose();
  };

  const handleCustomColorSubmit = () => {
    if (customColor) {
      handleColorSelect(customColor);
    }
  };

  const handleCustomColorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCustomColorSubmit();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={pickerRef}
      data-overlay
      className="fixed z-50 bg-card border border-border rounded-jotty shadow-lg p-3 min-w-64"
      style={{
        left: position?.x || 0,
        top: position?.y || 0,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PaintBrush04Icon className="h-4 w-4" />
            <span className="font-medium text-sm">
              {type === "text" ? "Text Color" : "Highlight Color"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <MultiplicationSignIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {colors.map((color) => (
            <button
              key={color.value}
              className={cn(
                "flex items-center justify-center h-8 rounded border text-xs font-medium transition-colors",
                color.value === ""
                  ? "border-border bg-background text-foreground"
                  : "border-transparent text-white",
                currentColor === color.value && "ring-2 ring-primary"
              )}
              style={{
                backgroundColor: color.value || undefined,
              }}
              onClick={() => handleColorSelect(color.value)}
              title={color.name}
            >
              {currentColor === color.value && (
                <Tick02Icon className="h-3 w-3" />
              )}
            </button>
          ))}
        </div>

        <div className="border-t pt-3">
          <div className="flex items-center gap-2">
            <Input
              id="custom-color-picker"
              label="Custom Color"
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="h-8 w-12 p-1"
              placeholder="#000000"
            />
            <Input
              id="custom-color-input"
              label="Custom Color"
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              onKeyDown={handleCustomColorKeyDown}
              placeholder="#000000"
              className="flex-1 text-xs"
            />
            <Button
              size="sm"
              onClick={handleCustomColorSubmit}
              disabled={!customColor}
              className="text-xs"
            >{t('common.apply')}</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
