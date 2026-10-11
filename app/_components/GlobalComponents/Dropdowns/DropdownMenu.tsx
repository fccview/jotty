"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/app/_utils/global-utils";
import { Button } from "../Buttons/Button";
import { useMenuPlacement } from "@/app/_hooks/useMenuPlacement";
import {
  MenuAlign,
  MenuSide,
  menuPlacementClasses,
} from "@/app/_utils/menu-placement-utils";

const MENU_MARGIN = 8;

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
  contextTarget?: React.RefObject<HTMLElement | null>;
}

export const DropdownMenu = ({
  trigger,
  items,
  align = "left",
  contextTarget,
}: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const cursorRef = useMemo(() => React.createRef<HTMLDivElement>(), [point]);
  const placement = useMenuPlacement(
    isOpen,
    point ? cursorRef : dropdownRef,
    menuRef,
    MenuSide.Down,
    !point && align === "right" ? MenuAlign.End : MenuAlign.Start,
  );

  useEffect(() => {
    const target = contextTarget?.current;
    if (!target) return;
    const handleContext = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setPoint({ x: event.clientX, y: event.clientY });
      setIsOpen(true);
    };
    target.addEventListener("contextmenu", handleContext);
    return () => target.removeEventListener("contextmenu", handleContext);
  }, [contextTarget]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !menuRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    const handleScroll = (event: Event) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      if (point) window.addEventListener("scroll", handleScroll, true);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, point]);

  const handleItemClick = (itemOnClick: () => void) => {
    itemOnClick();
    setIsOpen(false);
  };

  const handleToggle = () => {
    setPoint(null);
    setIsOpen(point ? true : !isOpen);
  };

  const renderMenu = (menu: React.ReactNode) => point ? createPortal(
    <div ref={cursorRef} className="fixed z-[10000]" style={{ top: point.y, left: point.x }}>
      {menu}
    </div>,
    document.body,
  ) : menu;

  return (
    <div
      ref={dropdownRef}
      className="jotty-dropdown-menu relative inline-block"
    >
      <div onClick={handleToggle} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && renderMenu(
        <div
          ref={menuRef}
          className={cn(
            "absolute min-w-56 w-fit bg-background border border-border rounded-jotty shadow-lg z-50 py-1",
            menuPlacementClasses(placement),
            point && "overflow-auto",
          )}
          style={point ? {
            maxHeight: Math.max(point.y, window.innerHeight - point.y) - MENU_MARGIN,
            maxWidth: Math.max(point.x, window.innerWidth - point.x) - MENU_MARGIN,
          } : undefined}
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
