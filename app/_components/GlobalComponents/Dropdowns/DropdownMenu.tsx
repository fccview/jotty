"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/app/_utils/global-utils";
import { Button } from "../Buttons/Button";
import { useMenuPlacement } from "@/app/_hooks/useMenuPlacement";
import {
  MenuAlign,
  MenuSide,
  menuPlacementClasses,
} from "@/app/_utils/menu-placement-utils";

interface DropdownItem {
  type?: "item" | "divider";
  label?: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: "default" | "destructive";
  className?: string;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
}

export const DropdownMenu = ({
  trigger,
  items,
  align = "left",
}: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const placement = useMenuPlacement(
    isOpen,
    dropdownRef,
    menuRef,
    MenuSide.Down,
    align === "right" ? MenuAlign.End : MenuAlign.Start,
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleItemClick = (itemOnClick: () => void) => {
    itemOnClick();
    setIsOpen(false);
  };

  const handleToggle = () => setIsOpen(!isOpen);

  return (
    <div
      ref={dropdownRef}
      className="jotty-dropdown-menu relative inline-block"
    >
      <div onClick={handleToggle} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          ref={menuRef}
          className={cn(
            "absolute min-w-56 w-fit bg-background border border-border rounded-jotty shadow-lg z-50 py-1",
            menuPlacementClasses(placement)
          )}
        >
          {items.map((item, index) => {
            if (item.type === "divider") {
              return <div key={index} className="h-px bg-border my-1" />;
            }

            return (
              <Button
                key={index}
                variant={"ghost"}
                size="sm"
                onClick={() => item.onClick && handleItemClick(item.onClick)}
                className={cn(
                  item.className || "",
                  "w-full flex items-center gap-3 text-md lg:text-sm transition-colors text-left rounded-none",
                  item.variant === "destructive" &&
                  "text-destructive hover:text-destructive-foreground hover:bg-destructive"
                )}
              >
                {item.icon && (
                  <span className="flex-shrink-0 w-4 h-4">{item.icon}</span>
                )}
                <span className="flex-grow">{item.label}</span>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
};
