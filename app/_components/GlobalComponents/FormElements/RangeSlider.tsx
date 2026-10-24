"use client";

import { CSSProperties } from "react";
import { cn, rangeFill } from "@/app/_utils/global-utils";

interface RangeSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  valueText: string;
  onChange: (value: number) => void;
  onCommit?: () => void;
  disabled?: boolean;
  showValue?: boolean;
  className?: string;
}

const COMMIT_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

export const RangeSlider = ({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  valueText,
  onChange,
  onCommit,
  disabled = false,
  showValue = true,
  className,
}: RangeSliderProps) => (
  <div className={cn("flex min-w-0 w-full items-center gap-3", className)}>
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      aria-label={label}
      aria-valuetext={valueText}
      onChange={(event) => onChange(Number(event.target.value))}
      onPointerUp={() => onCommit?.()}
      onKeyUp={(event) => {
        if (COMMIT_KEYS.has(event.key)) onCommit?.();
      }}
      className="jotty-range min-w-0 flex-1"
      style={{ "--range-fill": rangeFill(value, min, max) } as CSSProperties}
    />
    {showValue && (
      <span className="min-w-[4.5rem] shrink-0 truncate rounded-jotty jotty-value-chip px-2 py-0.5 text-center font-mono text-sm lg:text-xs tabular-nums text-foreground">
        {valueText}
      </span>
    )}
  </div>
);
