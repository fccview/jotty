"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";

interface ToolbarDropdownProps {
  trigger: ReactNode;
  children: ReactNode;
}

const PORTAL_ID = "toolbar-dropdown-portal-root";

export const ToolbarDropdown = ({
  trigger,
  children,
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
      portalRoot.style.zIndex = "9999";
      portalRoot.style.pointerEvents = "none";
      document.body.appendChild(portalRoot);
    }
    setPortalElement(portalRoot);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        event.target instanceof HTMLElement &&
        event.target.nodeName !== "INPUT"
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const dropdownContent = (
    <>
      {isOpen && (
        <div
          className="fixed bg-background border border-border rounded-md shadow-lg min-w-[200px] max-w-[200px] max-h-[300px] overflow-hidden flex flex-col"
          style={{
            top: `${
              (triggerRef.current?.getBoundingClientRect().bottom || 0) + 4
            }px`,
            left: `${triggerRef.current?.getBoundingClientRect().left || 0}px`,
            pointerEvents: "auto",
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
