"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/app/_utils/global-utils";
import { MENU_CLASS } from "@/app/_consts/styling";
import { useMenuPlacement } from "@/app/_hooks/useMenuPlacement";
import { useMediaQuery } from "@/app/_hooks/useMediaQuery";
import {
  MenuAlign,
  MenuSide,
  menuPlacementClasses,
} from "@/app/_utils/menu-placement-utils";

const DESKTOP_QUERY = "(min-width: 1024px)";

interface PopoverProps {
  trigger: (state: { isOpen: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  className?: string;
  menuClassName?: string;
  direction?: "down" | "up";
  disabled?: boolean;
}

export const Popover = ({
  trigger,
  children,
  className,
  menuClassName,
  direction = "down",
  disabled = false,
}: PopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const placement = useMenuPlacement(
    isOpen && !disabled,
    anchorRef,
    menuRef,
    direction === "up" ? MenuSide.Up : MenuSide.Down,
    isDesktop ? MenuAlign.Start : MenuAlign.End,
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const close = () => setIsOpen(false);
  const toggle = () => !disabled && setIsOpen(!isOpen);

  return (
    <div ref={anchorRef} className={cn("relative", className)}>
      {trigger({ isOpen, toggle })}
      {isOpen && !disabled && (
        <div
          ref={menuRef}
          className={cn(
            "jotty-dropdown-menu absolute z-50",
            MENU_CLASS,
            menuPlacementClasses(placement),
            menuClassName,
          )}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
};
