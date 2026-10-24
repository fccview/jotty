"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/app/_utils/global-utils";
import { useMenuPlacement } from "@/app/_hooks/useMenuPlacement";
import {
  KICKER_CLASS,
  MENU_CLASS,
  MENU_DIVIDER_CLASS,
  MENU_ITEM_CLASS,
  MENU_ITEM_DANGER_CLASS,
} from "@/app/_consts/styling";
import {
  MenuAlign,
  MenuSide,
  menuPlacementClasses,
} from "@/app/_utils/menu-placement-utils";

const MENU_MARGIN = 8;

interface DropdownItem {
  type?: "item" | "divider" | "heading";
  label?: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: "default" | "destructive";
  className?: string;
}

const isDivider = (item?: DropdownItem) => item?.type === "divider";

const isHeading = (item?: DropdownItem) => item?.type === "heading";

const tidyHeadings = (items: DropdownItem[]) =>
  items.filter((item, index, all) => {
    if (!isHeading(item)) return true;
    const next = all[index + 1];
    return Boolean(next) && !isDivider(next) && !isHeading(next);
  });

const tidyDividers = (items: DropdownItem[]) =>
  items.filter((item, index, all) => {
    if (!isDivider(item)) return true;
    const rest = all.slice(index + 1);
    const hasItemBefore = all.slice(0, index).some((entry) => !isDivider(entry));
    return hasItemBefore && !isDivider(all[index + 1]) && rest.some((entry) => !isDivider(entry));
  });

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  contextTarget?: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
}

export const DropdownMenu = ({
  trigger,
  items,
  align = "left",
  contextTarget,
  disabled = false,
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
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      setPoint({ x: event.clientX, y: event.clientY });
      setIsOpen(true);
    };
    target.addEventListener("contextmenu", handleContext);
    return () => target.removeEventListener("contextmenu", handleContext);
  }, [contextTarget, disabled]);

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

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
    if (disabled) return;
    itemOnClick();
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (disabled) return;
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
            "absolute min-w-48 w-max max-w-[min(20rem,calc(100vw-1rem))] z-50 flex flex-col gap-px p-1",
            MENU_CLASS,
            menuPlacementClasses(placement),
            point && "overflow-auto",
          )}
          style={point ? {
            maxHeight: Math.max(point.y, window.innerHeight - point.y) - MENU_MARGIN,
            maxWidth: Math.max(point.x, window.innerWidth - point.x) - MENU_MARGIN,
          } : undefined}
        >
          {tidyDividers(tidyHeadings(items)).map((item, index) => {
            if (isDivider(item)) {
              return <div key={index} className={MENU_DIVIDER_CLASS} />;
            }

            if (isHeading(item)) {
              return (
                <div key={index} role="presentation" className={cn(KICKER_CLASS, "px-2.5 pb-1 pt-1.5")}>
                  {item.label}
                </div>
              );
            }

            return (
              <button
                key={index}
                type="button"
                onClick={() => item.onClick && handleItemClick(item.onClick)}
                className={cn(
                  MENU_ITEM_CLASS,
                  item.variant === "destructive" && MENU_ITEM_DANGER_CLASS,
                  item.className,
                )}
              >
                {item.icon && (
                  <span className="flex-shrink-0 w-4 h-4">{item.icon}</span>
                )}
                <span className="flex-grow">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
