"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/app/_utils/global-utils";
import { Button } from "../Buttons/Button";

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
  const [openUpward, setOpenUpward] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

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

  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();

      let scrollParent: HTMLElement | null = triggerRef.current.parentElement;
      while (scrollParent) {
        if (scrollParent.classList.contains('jotty-sidebar-categories') || scrollParent.classList.contains('jotty-sidebar-tags')) {
          break;
        }
        scrollParent = scrollParent.parentElement;
      }

      if (scrollParent) {
        const containerRect = scrollParent.getBoundingClientRect();
        const actualSpaceBelow = containerRect.bottom - rect.bottom;
        const threshold = 200;

        setOpenUpward(actualSpaceBelow < threshold);
      }
    }
    setIsOpen(!isOpen);
  };

  return (
    <div
      ref={dropdownRef}
      className="jotty-dropdown-menu relative inline-block"
    >
      <div ref={triggerRef} onClick={handleToggle} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={cn(
            "absolute w-56 bg-background border border-border rounded-jotty shadow-lg z-50 py-1",
            openUpward ? "bottom-full mb-1" : "top-full mt-1",
            align === "right" ? "right-0" : "left-0"
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
