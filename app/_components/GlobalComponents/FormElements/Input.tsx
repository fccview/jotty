import { ChangeEvent, forwardRef, useState } from "react";
import { Label } from "./label";
import { ViewIcon, ViewOffSlashIcon } from "hugeicons-react";

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
  hideEye?: boolean;
  maxLength?: number;
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
      hideEye,
      maxLength,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordType = type === "password";
    const inputType = isPasswordType && showPassword ? "text" : type;

    return (
      <div className="space-y-2 w-full">
        {label && <Label htmlFor={id}>{label}</Label>}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            name={name}
            type={inputType}
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
            maxLength={maxLength}
            {...props}
            className={`w-full px-4 py-2.5 bg-background border border-input rounded-jotty text-md lg:text-sm focus:outline-none focus:ring-none ${isPasswordType ? "pr-11" : ""} ${className}`}
          />
          {isPasswordType && !hideEye && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              disabled={disabled}
            >
              {showPassword ? (
                <ViewOffSlashIcon className="h-4 w-4" />
              ) : (
                <ViewIcon className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
        {description && (
          <p className="text-md lg:text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
