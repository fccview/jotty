"use client";

interface RangeSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  valueText: string;
  onChange: (value: number) => void;
  disabled?: boolean;
  valueClassName?: string;
}

export const RangeSlider = ({
  id,
  label,
  value,
  min,
  max,
  step,
  valueText,
  onChange,
  disabled = false,
  valueClassName = "font-mono",
}: RangeSliderProps) => (
  <div className="flex items-center gap-4">
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
      className="w-full accent-primary disabled:opacity-50"
    />
    <span
      className={`w-20 shrink-0 whitespace-nowrap overflow-hidden text-right text-md lg:text-xs text-muted-foreground ${valueClassName}`}
    >
      {valueText}
    </span>
  </div>
);
