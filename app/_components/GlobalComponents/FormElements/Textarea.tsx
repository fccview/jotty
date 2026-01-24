import { ChangeEvent, forwardRef } from "react";
import { Label } from "./label";

interface TextareaProps {
  id: string;
  label?: string;
  name?: string;
  description?: React.ReactNode;
  value?: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  className?: string;
  defaultValue?: string;
  rows?: number;
  minHeight?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      id,
      label,
      name,
      description,
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
      rows,
      minHeight,
      ...props
    },
    ref
  ) => (
    <div className="space-y-2 w-full">
      {label && <Label htmlFor={id}>{label}</Label>}
      <textarea
        ref={ref}
        id={id}
        name={name}
        value={value}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        rows={rows}
        {...props}
        className={`flex w-full rounded-jotty border border-input bg-background px-3 py-2 text-md lg:text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ""
          }`}
        style={minHeight ? { minHeight } : undefined}
      />
      {description && (
        <p className="text-md lg:text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
);

Textarea.displayName = "Textarea";
