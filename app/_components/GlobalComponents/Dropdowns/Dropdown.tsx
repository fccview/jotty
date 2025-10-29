"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/app/_utils/global-utils";

interface DropdownOption {
  id: number | string;
  name: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface DropdownProps {
  value: string | number;
  options: DropdownOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  iconDropdown?: boolean;
}

export const Dropdown = ({
  value,
  options,
  onChange,
  className = "",
  disabled = false,
  placeholder = "",
  iconDropdown = false,
}: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (e: React.MouseEvent, optionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(optionId);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {iconDropdown ? (
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <MoreHorizontal
            className={cn(
              `h-4 w-4 transition-transform text-muted-foreground`,
              isOpen ? "rotate-180" : "",
              disabled && "opacity-50 text-muted-foreground"
            )}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            if (!disabled) {
              setIsOpen(!isOpen);
            }
          }}
          className={cn(
            "w-full flex items-center justify-between p-3 rounded-lg border border-border transition-colors",
            disabled
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "hover:bg-muted/50",
            isOpen && "bg-muted/50"
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            {selectedOption?.icon && (
              <selectedOption.icon className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">
              {selectedOption?.name || placeholder}
            </span>
          </div>
          <ChevronDown
            className={cn(
              `h-4 w-4 transition-transform`,
              isOpen ? "rotate-180" : "",
              disabled && "opacity-50"
            )}
          />
        </button>
      )}

      {isOpen && !disabled && (
        <div className="absolute right-0 lg:left-0 lg:right-auto z-50 w-full min-w-[200px] mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-track]:bg-muted/20 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={(e) => handleSelect(e, option.id.toString())}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                  option.id === value && "bg-accent text-accent-foreground"
                )}
              >
                {option.icon && <option.icon className="h-4 w-4" />}
                <span>{option.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
