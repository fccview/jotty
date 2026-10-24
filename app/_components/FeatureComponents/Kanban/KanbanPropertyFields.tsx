"use client";

import { ReactNode } from "react";
import { ArrowDown01Icon } from "hugeicons-react";
import { Dropdown, DropdownOption } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { PROPERTY_FIELD_CLASS } from "@/app/_consts/kanban";
import { cn } from "@/app/_utils/global-utils";

interface PropertyFieldProps {
  label: string;
  children: ReactNode;
  wide?: boolean;
}

export const PropertyField = ({ label, children, wide = false }: PropertyFieldProps) => (
  <div className={cn("min-w-0 space-y-1.5", wide && "col-span-2")}>
    <span className="block text-xs font-medium text-muted-foreground">{label}</span>
    {children}
  </div>
);

export const PropertyDot = ({ color }: { color: string }) => (
  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
);

interface PropertySelectProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
}

export const PropertySelect = ({ value, options, onChange }: PropertySelectProps) => (
  <Dropdown
    value={value}
    options={options}
    onChange={onChange}
    trigger={({ isOpen, toggle, selected }) => (
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        className={cn(
          PROPERTY_FIELD_CLASS,
          "flex items-center justify-between gap-2 text-left hover:bg-muted/50",
          isOpen && "border-ring",
        )}
      >
        <span className="min-w-0 truncate">{selected?.name}</span>
        <ArrowDown01Icon
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>
    )}
  />
);
