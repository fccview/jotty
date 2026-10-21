"use client";

import { ReactNode } from "react";
import { ArrowDown01Icon, MoreHorizontalIcon } from "hugeicons-react";
import { cn } from "@/app/_utils/global-utils";
import { Logo } from "../Layout/Logo/Logo";
import { Popover } from "./Popover";

export interface DropdownOption {
  id: number | string;
  name: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  colors?: { background: string; primary: string } | null;
  className?: string;
  meta?: ReactNode;
}

interface DropdownProps {
  value: string | number;
  options: DropdownOption[];
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  iconDropdown?: boolean;
  direction?: "down" | "up";
  trigger?: (state: { isOpen: boolean; toggle: () => void; selected?: DropdownOption }) => ReactNode;
  menuClassName?: string;
}

const OptionLogo = ({ colors, className }: { colors: { background: string; primary: string }; className: string }) => (
  <Logo
    className={className}
    style={{
      backgroundColor: `rgb(${colors.background})`,
      border: `1px solid rgb(${colors.primary})`,
    }}
    pathStyle={{ fill: `rgb(${colors.primary})` }}
  />
);

const DropdownOptions = ({
  options,
  value,
  onSelect,
}: {
  options: DropdownOption[];
  value: string | number;
  onSelect: (id: string) => void;
}) => (
  <div className="py-1">
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSelect(option.id.toString());
        }}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-md lg:text-sm text-left hover:bg-accent hover:text-accent-foreground",
          option.id === value && "bg-accent text-accent-foreground",
          option.className
        )}
      >
        {option.icon && <option.icon className="h-4 w-4" />}
        <span className="flex-1">{option.name}</span>
        {option.meta}
        {option.colors && <OptionLogo colors={option.colors} className="h-5 w-5 ml-auto" />}
      </button>
    ))}
  </div>
);

export const Dropdown = ({
  value,
  options,
  onChange,
  id,
  className = "",
  disabled = false,
  placeholder = "",
  iconDropdown = false,
  direction = "down",
  trigger,
  menuClassName,
}: DropdownProps) => {
  const selectedOption = options.find((opt) => opt.id === value);

  return (
    <Popover
      className={cn("jotty-dropdown", className)}
      direction={direction}
      disabled={disabled}
      menuClassName={cn(
        trigger ? "min-w-[220px]" : "w-full min-w-[200px] max-h-48 overflow-y-auto",
        menuClassName
      )}
      trigger={({ isOpen, toggle }) => {
        if (trigger) return trigger({ isOpen, toggle, selected: selectedOption });

        if (iconDropdown) {
          return (
            <div
              className="jotty-dropdown-icon flex items-center gap-2 cursor-pointer"
              onClick={toggle}
            >
              <MoreHorizontalIcon
                className={cn(
                  `h-4 w-4 transition-transform text-muted-foreground`,
                  isOpen ? "rotate-180" : "",
                  disabled && "opacity-50 text-muted-foreground"
                )}
              />
            </div>
          );
        }

        return (
          <button
            id={id}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggle();
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
              {selectedOption?.icon && <selectedOption.icon className="h-4 w-4" />}
              <span className="text-md lg:text-sm font-medium">
                {selectedOption?.name || placeholder}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedOption?.colors && (
                <OptionLogo colors={selectedOption.colors} className="h-5 w-5" />
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
        );
      }}
    >
      {(close) => (
        <DropdownOptions
          options={options}
          value={value}
          onSelect={(optionId) => {
            onChange(optionId);
            close();
          }}
        />
      )}
    </Popover>
  );
};
