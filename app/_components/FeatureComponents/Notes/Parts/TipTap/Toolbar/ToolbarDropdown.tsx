"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";
import { MENU_CLASS } from "@/app/_consts/styling";

interface ToolbarDropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  direction?: "left" | "right";
  onOpenChange?: (isOpen: boolean) => void;
}

const PORTAL_ID = "toolbar-dropdown-portal-root";

export const ToolbarDropdown = ({
  trigger,
  children,
  direction = "left",
  onOpenChange,
}: ToolbarDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let portalRoot = document.getElementById(PORTAL_ID);
    if (!portalRoot) {
      portalRoot = document.createElement("div");
      portalRoot.id = PORTAL_ID;
      portalRoot.style.position = "fixed";
      portalRoot.style.top = "0";
      portalRoot.style.left = "0";
      // Stack above the modal portal root (z-index 9999) so dropdowns
      // render on top of modal overlays when the editor is used inside a modal.
      portalRoot.style.zIndex = "10000";
      portalRoot.style.pointerEvents = "none";
      document.body.appendChild(portalRoot);
    }
    setPortalElement(portalRoot);
  }, []);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        event.target instanceof Element &&
        !(event.target instanceof HTMLInputElement)
      ) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
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

  const dropdownContent = (
    <>
      {isOpen && (
        <div
          className={`${MENU_CLASS} fixed min-w-[200px] max-w-[200px] max-h-[300px] overflow-hidden flex flex-col`}
          style={{
            top: `${
              (triggerRef.current?.getBoundingClientRect().bottom || 0) + 4
            }px`,
            pointerEvents: "auto",
            ...(direction === "right"
              ? {
                  right: `${
                    window.innerWidth -
                    (triggerRef.current?.getBoundingClientRect().right || 0)
                  }px`,
                }
              : {
                  left: `${
                    triggerRef.current?.getBoundingClientRect().left || 0
                  }px`,
                }),
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onClick={(e) => {
            if (
              e.target instanceof HTMLElement &&
              (e.target as HTMLElement).nodeName !== "INPUT"
            ) {
              setIsOpen(false);
            } else {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          {children}
        </div>
      )}
    </>
  );

  return (
    <div
      className="relative"
      ref={triggerRef}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => setIsOpen(!isOpen)}
    >
      {trigger}
      {portalElement && createPortal(dropdownContent, portalElement)}
    </div>
  );
};
