"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowDown01Icon, MoreHorizontalIcon } from "hugeicons-react";
import { cn } from "@/app/_utils/global-utils";
import { Logo } from "../Layout/Logo/Logo";

interface DropdownOption {
  id: number | string;
  name: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  colors?: { background: string; primary: string } | null;
}

interface DropdownProps {
  value: string | number;
  options: DropdownOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  iconDropdown?: boolean;
  direction?: "down" | "up";
}

export const Dropdown = ({
  value,
  options,
  onChange,
  className = "",
  disabled = false,
  placeholder = "",
  iconDropdown = false,
  direction = "down",
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
    <div className={`jotty-dropdown relative ${className}`} ref={dropdownRef}>
      {iconDropdown ? (
        <div
          className="jotty-dropdown-icon flex items-center gap-2 cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <MoreHorizontalIcon
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
            "jotty-dropdown-button w-full flex items-center justify-between p-3 rounded-jotty border border-border transition-colors",
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
            <span className="text-md lg:text-sm font-medium">
              {selectedOption?.name || placeholder}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedOption?.colors && (
              <Logo
                className="h-5 w-5"
                style={{
                  backgroundColor: `rgb(${selectedOption.colors.background})`,
                  border: `1px solid rgb(${selectedOption.colors.primary})`,
                }}
                pathStyle={{ fill: `rgb(${selectedOption.colors.primary})` }}
              />
            )}
            <ArrowDown01Icon
              className={cn(
                `h-4 w-4 transition-transform`,
                isOpen ? "rotate-180" : "",
                disabled && "opacity-50"
              )}
            />
          </div>
        </button>
      )}

      {isOpen && !disabled && (
        <div className={cn(
          "jotty-dropdown-menu absolute right-0 lg:left-0 lg:right-auto z-50 w-full min-w-[200px] bg-card border border-border rounded-jotty shadow-lg max-h-48 overflow-y-auto",
          direction === "up" ? "bottom-full mb-1" : "mt-1"
        )}>
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={(e) => handleSelect(e, option.id.toString())}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-md lg:text-sm hover:bg-accent hover:text-accent-foreground",
                  option.id === value && "bg-accent text-accent-foreground"
                )}
              >
                {option.icon && <option.icon className="h-4 w-4" />}
                <span>{option.name}</span>
                {option.colors && (
                  <Logo
                    className="h-5 w-5 ml-auto"
                    style={{
                      backgroundColor: `rgb(${option.colors.background})`,
                      border: `1px solid rgb(${option.colors.primary})`,
                    }}
                    pathStyle={{ fill: `rgb(${option.colors.primary})` }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
