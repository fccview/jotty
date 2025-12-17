import { ChangeEvent, forwardRef } from "react";
import { Label } from "./label";

interface InputProps {
  id: string;
  label?: string;
  name?: string;
  description?: React.ReactNode;
  value?: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
  defaultValue?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  min?: string;
  max?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      label,
      name,
      description,
      type,
      autoComplete,
      required,
      disabled,
      placeholder,
      value,
      className,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      autoFocus,
      min,
      max,
      ...props
    },
    ref
  ) => (
    <div className="space-y-2 w-full">
      {label && <Label htmlFor={id}>{label}</Label>}
      <input
        ref={ref}
        id={id}
        name={name}
        type={type}
        value={value}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        min={min}
        max={max}
        {...props}
        className={`w-full px-4 py-2.5 bg-background border border-input rounded-jotty text-sm focus:outline-none focus:ring-none ${className}`}
      />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
);

Input.displayName = "Input";
