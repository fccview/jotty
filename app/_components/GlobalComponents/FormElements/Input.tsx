import { ChangeEvent, FC } from "react";
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
  className?: string;
  defaultValue?: string;
  ref?: React.RefObject<HTMLInputElement>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const Input: FC<InputProps> = ({
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
  onKeyDown,
  ref,
  ...props
}) => (
  <div className="space-y-2">
    {label && <Label htmlFor={id}>{label}</Label>}
    <input
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
      {...props}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
    {description && (
      <p className="text-xs text-muted-foreground">{description}</p>
    )}
  </div>
);
