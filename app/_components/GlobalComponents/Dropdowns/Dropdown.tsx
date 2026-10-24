"use client";

import { ReactNode } from "react";
import { ArrowDown01Icon, MoreHorizontalIcon, Tick02Icon } from "hugeicons-react";
import { cn } from "@/app/_utils/global-utils";
import { MENU_ITEM_ACTIVE_CLASS, MENU_ITEM_CLASS } from "@/app/_consts/styling";
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
  <div className="flex flex-col gap-px p-1">
    {options.map((option) => {
      const isSelected = option.id === value;

      return (
        <button
          key={option.id}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(option.id.toString());
          }}
          className={cn(MENU_ITEM_CLASS, isSelected && MENU_ITEM_ACTIVE_CLASS, option.className)}
        >
          {option.icon && <option.icon className="h-4 w-4 shrink-0" />}
          <span className="flex-1">{option.name}</span>
          {option.meta}
          {option.colors && <OptionLogo colors={option.colors} className="h-5 w-5 ml-auto" />}
          {isSelected && !option.colors && <Tick02Icon className="h-4 w-4 shrink-0" />}
        </button>
      );
    })}
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
              "jotty-dropdown-button w-full flex items-center justify-between p-3 rounded-jotty border border-border transition-[background-color,border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              disabled
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "hover:bg-muted/50 hover:border-primary/30",
              isOpen && "border-primary/50 ring-2 ring-primary/10"
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
                  `h-4 w-4 text-muted-foreground transition-transform duration-200`,
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
